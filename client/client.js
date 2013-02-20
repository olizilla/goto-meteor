/*
Scenarios
- First time this browser/user combo has gone to the site.
*/

var map;

var markers = new Meteor.Collection("markers"); // a client side record of all the markers on the map, keyed by playerId

markers.find().observe({
	removed:function(doc){ map.removeLayer(doc.marker); },
	added:function(doc){ doc.marker.addTo(map); }
});

function initMap() {

	map = L.map('map').setView([51.505, -0.09], 12);

	L.tileLayer("http://{s}tile.stamen.com/toner/{z}/{x}/{y}.png", {
		"minZoom":      0,
		"maxZoom":      20,
		"subdomains":   ["", "a.", "b.", "c.", "d."],
		"scheme":       "xyz"
	}).addTo(map);

	return map;
}

function createMapMarker(coords, iconUrl){
	
	console.log(arguments);
	
	var longitude = coords.longitude;
	var latitude = coords.latitude;

	if (!latitude || !longitude){
		return false;
	}

	var latLng = [latitude, longitude];

	return L.marker(latLng, {
		icon: L.icon({
			iconUrl: iconUrl,
			iconSize:[40, 40]

		})
	});
}

function retrieveOrCreatePlayerId(){

	var playerId = window.localStorage['playerId'];
	
	// Never seen you before
	if (!playerId){
		playerId = Players.insert({});
		window.localStorage['playerId'] = playerId;
	} else {
		// Are you in the db yet?
		var player = Players.findOne(playerId);
		if (!player){
			console.log('No player found, db probably got wiped, recreating now.');
			Players.insert({ _id: playerId });
		}
	}

	Session.set('playerId', playerId);

	console.log('Player', playerId);
}

/*
 * Meteor.startup "will run as soon as the DOM is ready and any <body> templates from your .html files have been put on the screen."
 * http://docs.meteor.com/#meteor_startup
 */
Meteor.startup(function () {

	retrieveOrCreatePlayerId();

	initMap();

	startWatchingGeolocation();

	// Run a function and rerun it whenever its dependencies change.
	Meteor.autorun(function(){

		console.log('Startup autorun');

		markers.remove({}); // Kill them all

		Players.find().forEach(function(player){
			
			console.log(player);

			if (!player || !player.position || !player.position.coords || !player.position.coords.latitude || !map){
				return false;
			}

			var coords = player.position.coords;

			var marker = createMapMarker(coords, gravatarUrl(player.emailHash));

			markers.insert({_id: player._id, marker: marker});

			if (player._id === getCurrentUser()._id) {
				map.panTo([coords.latitude, coords.longitude]);
			}
		});
	});
});

// Try and get a gravatar Url
Template.gravatar.url = function(){
	var player = Players.findOne(Session.get('playerId'));
	
	console.log('Template gravatar.url called', player);
	
	if (!player || !player.emailHash){
		return false;// don't return null, always return a default or you get errors.
	}

	return gravatarUrl(player.emailHash);
};

// Hash the email and store the result
Template.gravatar.events({

	'click .save' : function (event, template) {

		var email = template.find('.email').value;

		if (email && email !== ''){
			var hash = $.md5(email);
			Players.update(Session.get('playerId'), { $set: { emailHash: hash }});
		}

		console.log(Players.findOne(Session.get('playerId')));
	}
});

function getCurrentUser() {
	return Players.findOne(Session.get('playerId'));
}

function gravatarUrl(hash) {
	return 'http://www.gravatar.com/avatar/' + hash + '?d=mm';
}

function startWatchingGeolocation(){
	if (navigator.geolocation) {
		navigator.geolocation.watchPosition(function(pos){
			console.log('Current Position', pos);

			pos = $.extend(true, {}, pos); // Fix FF error 'Cannot modify properties of a WrappedNative'

			if (!pos.coords.latitude || pos.coords.longitude){
				return; // we don't want yer lousy geolocation anyway.
			}

			Players.update(Session.get('playerId'), {$set: { position: pos }, $push: {route: pos } });

		}, error, {enableHighAccuracy:true, maximumAge:5000, timeout:10000});
	} else {
		error('geolocation not supported');
	}
}

function error(msg) {
	console.log(arguments);
}

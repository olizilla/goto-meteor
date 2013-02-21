/*
 * GOTO: A Meteor based, collections-centric experiment in geolocation and watching people arrive.
 */

var map;

/*
 * Meteor.startup "will run as soon as the DOM is ready and any <body> templates from your .html files have been put on the screen."
 * http://docs.meteor.com/#meteor_startup
 */
Meteor.startup(function () {

	initMap();

	// Set up the current user once the Players collection is ready.
	Meteor.subscribe('allplayers', function(){
		console.log('Players ready!', Players);
		
		retrieveOrCreatePlayer();
		
		startWatchingGeolocation();
	});

	// Keep the local markers collection in sync with the players
	Players.find({}).observe({

		added:function(newPlayer){
			
			console.log('Player added', newPlayer);

			var marker = createMapMarker(newPlayer);
			
			if (marker){
				marker.addTo(map);
			}
		},

		changed: function(oldPlayer, index, newPlayer){
			console.log('Player changed', oldPlayer, newPlayer);

			removeMapMarkerIfExists(oldPlayer._id);

			var marker = createMapMarker(newPlayer);
			
			if (marker){
				marker.addTo(map);
			}
		},

		removed:function(oldPlayer){
			console.log('Player removed', oldPlayer);

			removeMapMarkerIfExists(oldPlayer._id);
		}
	});
});

// ---- Templates -------------------------------------------------------------

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

	'click .save' : function(event, template){

		var email = template.find('.email').value;

		if (email && email !== ''){
			var hash = $.md5(email);
			var name = /(.+)@/.exec(email)[1];

			Players.update(Session.get('playerId'), { $set: { emailHash: hash, name: name }});
			console.log('Updated players emailHash');
		}
	},

	'click .gravatar': function(event, template){

		Players.update(Session.get('playerId'), { $set: { emailHash: null }});

		console.log('Deleted players emailHash');
	}
});

// ---- Helpers ---------------------------------------------------------------

function initMap() {

	// map = L.map('map').setView([51.505, -0.09], 12);
	map = L.map('map').setView([20,0], 2);

	L.tileLayer("http://{s}tile.stamen.com/toner/{z}/{x}/{y}.png", {
		"minZoom":      0,
		"maxZoom":      20,
		"subdomains":   ["", "a.", "b.", "c.", "d."],
		"scheme":       "xyz"
	}).addTo(map);

	return map;
}

function createMapMarker(player){

	if (!player || !player.position || !player.position.coords){
		return false;
	}
	var coords = player.position.coords;
	var longitude = coords.longitude;
	var latitude = coords.latitude;

	if (!latitude || !longitude){
		return false;
	}

	var marker = L.marker([latitude, longitude], {
		opacity: 0.9,
		riseOnHover: true,
		title: player.name
	});

	if (player.emailHash){
		marker.setIcon(
			L.icon({
				iconUrl: gravatarUrl(player.emailHash),
				iconSize:[40, 40],
				iconAnchor: [0, 0],
			})
		);
	}

	marker.playerId = player._id;

	console.log('Created marker', marker);

	return marker;
}

function findMapMarker(id){
	var result = null;

	$.each(map._layers, function(index, layer){
		
		if (layer.playerId === id){

			console.log('Found marker', layer);

			result = layer;

			return false;
		}
	});
	
	if (!result){
		console.log("Didn't find marker", id);
	}
	
	return result;
}

function removeMapMarkerIfExists(id){
	var marker = findMapMarker(id);
	if(marker){
		map.removeLayer(marker);
	}
}

function retrieveOrCreatePlayer(){

	var playerId = window.localStorage['playerId'];
	
	// Never seen you before
	if (!playerId){
		playerId = Players.insert({ emailHash: null });
		window.localStorage['playerId'] = playerId;
	} else {
		var player = Players.findOne({_id: playerId});
		// Are you still in the db?
		if (!player){
			console.log('Player not found, db probably got wiped, recreating now.');
			Players.insert({ _id: playerId, emailHash: null });
		}
	}

	Session.set('playerId', playerId);

	console.log('PlayerId', playerId);

	return playerId;
}

function getCurrentUser() {
	return Players.findOne(Session.get('playerId'));
}

function gravatarUrl(hash) {
	return 'http://www.gravatar.com/avatar/' + hash + '?d=mm';
}

function startWatchingGeolocation(){
	if (navigator.geolocation) {
		navigator.geolocation.watchPosition(function(pos){
			console.log('Got Position', pos);

			pos = $.extend(true, {}, pos); // Fix FF error 'Cannot modify properties of a WrappedNative'

			if (!pos.coords.latitude || !pos.coords.longitude){
				console.warn("Position doesn't have lat/lng. Ignoring", pos);
				return; // we don't want yer lousy geolocation anyway.
			}

			Players.update(Session.get('playerId'), {$set: { position: pos }, $push: {route: pos } });

			if (!this.hasCenteredMap){
				var zoom = 11;
				map.setView([pos.coords.latitude, pos.coords.longitude], zoom);
				this.hasCenteredMap = true;
			}

		}, error, {enableHighAccuracy:false, maximumAge:60000, timeout:100000});

	} else {
		error('geolocation not supported');
	}
}

function error(msg) {
	console.log(arguments);
}

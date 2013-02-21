/*
 * GOTO: A Meteor based, collections-centric experiment in geolocation and watching people arrive.
 */

var map;

var markers = new Meteor.Collection(null); // a client side record of all the markers on the map, keyed by playerId

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

	// Keep the markers on the map in sync with the markers collection
	markers.find({}).observe({

		added:function(doc){
			console.log('Marker added', doc);
			doc.addTo(map);
		},

		changed:function(newDoc, index, oldDoc){
			console.log('Marker changed', newDoc, oldDoc);
			map.removeLayer(oldDoc);
			newDoc.addTo(map);
		},

		removed:function(doc){
			console.log('Marker removed', doc);
			map.removeLayer(doc);
		}
	});

	// Keep the local markers collection in sync with the players
	Players.find({}).observe({

		added:function(player){
			
			console.log('Player added', player);

			var marker = createMapMarker(player);

			marker._id = player._id;
			markers.insert(marker);

			// markers.insert({_id: player._id, marker: marker});
		},

		changed: function(player){
			console.log('Player changed', player);

			markers.remove({_id: player._id});

			var marker = createMapMarker(player);
			marker._id = player._id;
			
			markers.insert(marker);

			// markers.update({_id: player._id}, { $set: {marker: marker}});
		},

		removed:function(player){
			console.log('Player removed', player);

			markers.remove({_id: player._id});
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
			Players.update(Session.get('playerId'), { $set: { emailHash: hash }});
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

	map = L.map('map').setView([51.505, -0.09], 12);

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

	var icon = gravatarUrl(player.emailHash);

	return L.marker([latitude, longitude], {
		icon: L.icon({
			iconUrl: icon,
			iconSize:[40, 40]
		})
	});
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

		}, error, {enableHighAccuracy:true, maximumAge:5000, timeout:10000});

	} else {
		error('geolocation not supported');
	}
}

function error(msg) {
	console.log(arguments);
}

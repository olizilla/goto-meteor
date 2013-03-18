/*
 * GOTO: A Meteor based, collections-centric experiment in geolocation and watching people arrive.
 */

var map;
var clusterGroup;

/*
 * Meteor.startup "will run as soon as the DOM is ready and any <body> templates from your .html files have been put on the screen."
 * http://docs.meteor.com/#meteor_startup
 */
Meteor.startup(function () {

	initMap();
	initMarkerClusterGroup(map);

	// Set up the current user once the Players collection is ready.
	Meteor.subscribe('allplayers', function(){
		// console.log('Players ready!', Players);
		
		retrieveOrCreatePlayer();
		
		startWatchingGeolocation();
	});

	// Keep the local markers collection in sync with the players
	Players.find({}).observe({

		added:function(newPlayer){
			
			console.log('Player added', newPlayer);

			var marker = createMarker(newPlayer);
			
			if (marker){
				marker.addTo(clusterGroup);
			}
		},

		changed: function(newPlayer, oldPlayer){
			console.log('Player changed', oldPlayer, newPlayer);

			removeMarkerIfExists(oldPlayer._id);

			var marker = createMarker(newPlayer);
			
			if (marker){
				marker.addTo(clusterGroup);
			}
		},

		removed:function(oldPlayer){
			console.log('Player removed', oldPlayer);

			removeMarkerIfExists(oldPlayer._id);
		}
	});
});

// ---- Templates -------------------------------------------------------------

// Try and get a gravatar Url
Template.gravatar.url = function(){
	var player = Players.findOne(Session.get('playerId'));
	
	// console.log('Template gravatar.url called', player);
	
	if (!player || !player.emailHash){
		return false;// don't return null, always return a default or you get errors.
	}

	return gravatarUrl(player.emailHash);
};

// Hash the email and store the result
Template.gravatar.events({

	'click .save' : function(event, template){
		var email = template.find('.email').value;
		updatePlayerEmail(email);
	},

	'click .gravatar': function(event, template){
		Players.update(Session.get('playerId'), { $set: { emailHash: null }});
		// console.log('Deleted players emailHash');
	},

	'keypress input': function(event, template){
		if(event.which == 13) {
			// console.log(event);
			event.preventDefault();
            var email = template.find('.email').value;
			updatePlayerEmail(email);
        }
	}
});

// ---- Helpers ---------------------------------------------------------------

function initMap() {

	var center = [20,0];
	var zoom = 2;

	if(Meteor.settings && Meteor.settings.public && Meteor.settings.public.center){
		settings = Meteor.settings.public.center;

		center = [settings.lat, settings.lng];
		zoom = settings.zoom;
	}

	map = L.map('map').setView(center, zoom);

	L.tileLayer("http://{s}tile.stamen.com/toner/{z}/{x}/{y}.png", {
		"minZoom":      0,
		"maxZoom":      20,
		"subdomains":   ["", "a.", "b.", "c.", "d."],
		"scheme":       "xyz"
	}).addTo(map);

	return map;
}

/**
 * Create the cluster group layer and add it to the provided map.
 * 
 * @param map
 * @return {L.MarkerClusterGroup}
 */
function initMarkerClusterGroup(map) {
	
	clusterGroup = new L.MarkerClusterGroup();
	
	map.addLayer(clusterGroup);
	
	return clusterGroup;
}

function createMarker(player){

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
				iconSize:[40, 40]
			})
		);
	}

	marker.playerId = player._id;

	// console.log('Created marker', marker);

	return marker;
}

function findMarker(id){
	var result = null;
	
	$.each(clusterGroup._layers, function(index, layer) {
		
		// This could be a marker, or a cluster
		if(layer.playerId === id) {
			
			result = layer;
			
		} else if(layer._markers) {
			
			$.each(layer._markers, function(index, marker) {
				
				if (marker.playerId === id){
		
					// console.log('Found marker', layer);
		
					result = marker;
		
					return false;
				}
			});
		}
		
		if(result) return false;
	});
	
	if (!result){
		console.log("Didn't find marker", id);
	}
	
	return result;
}

function removeMarkerIfExists(id){
	var marker = findMarker(id);
	if(marker){
		clusterGroup.removeLayer(marker);
	}
}

function retrieveOrCreatePlayer(){

	var playerId = window.localStorage['playerId'];
	
	// Never seen you before
	if (!playerId){
		playerId = Players.insert({ emailHash: null });
		window.localStorage['playerId'] = playerId;
		$('#about').modal('show');
	} else {
		var player = Players.findOne({_id: playerId});
		// Are you still in the db?
		if (!player){
			console.log('Player not found, db probably got wiped, recreating now.');
			Players.insert({ _id: playerId, emailHash: null });
		}

		if(!player || !player.emailHash || !player.position){
			$('#about').modal('show');
		}
	}

	Session.set('playerId', playerId);

	console.log('PlayerId', playerId);

	return playerId;
}

function updatePlayerEmail(email){
	var nameRegex = /(.+)@/;
	
	if (nameRegex.test(email)){
		
		var name = nameRegex.exec(email)[1];

		var hash = $.md5(email);

		Players.update(Session.get('playerId'), { $set: { emailHash: hash, name: name }});
		
		// console.log('Updated players emailHash');

	} else {
		console.log("Bad email address", email);
	}
}

function getCurrentUser() {
	return Players.findOne(Session.get('playerId'));
}

function gravatarUrl(hash) {
	return 'http://www.gravatar.com/avatar/' + hash + '?s=40&d=mm';
}

function startWatchingGeolocation(){
	if (navigator.geolocation) {
		navigator.geolocation.watchPosition(function(pos){
			// console.log('Got Position', pos);

			pos = $.extend(true, {}, pos); // Fix FF error 'Cannot modify properties of a WrappedNative'

			if (!pos.coords.latitude || !pos.coords.longitude){
				console.warn("Position doesn't have lat/lng. Ignoring", pos);
				return; // we don't want yer lousy geolocation anyway.
			}

			Players.update(Session.get('playerId'), { $set: { position: pos } });

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

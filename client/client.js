/**
 * Every session gets a session id
 * Mutiple sessions can have the same email address
 *
 * Show all users position on the map as avatar.
 */

Meteor.startup(function () {

	var retrieveOfCreatePlayerId = function(){

		var playerId = window.localStorage['playerId'];

		// You're not from round here...
		if (!playerId){
			playerId = Players.insert({});
			window.localStorage['playerId'] = playerId;
		}

		console.log('playerId: ', playerId);

		Session.set('playerId', playerId);

		console.log('startup player:', getCurrentUser());
	};

	// Do it.
	retrieveOfCreatePlayerId();

	initMap();

	getCurrentPosition();

	Meteor.autorun(function(){
//	var longitude = Session.get('longitude');
//	var latitude = Session.get('latitude');
//	var zoom = Session.get('zoom');

		// console.log('startup autorun called', player);

		Players.find().forEach(function(player){
			if (!player || !player.position || !map){
			return false;
			}
			var longitude = player.position.coords.longitude;
			var latitude = player.position.coords.latitude;
			var zoom = player.position.zoom;

			var pos = lonlat(longitude, latitude);

			// map.panTo(point);
			// map.zoomTo(zoom);

			var pointFeature = createPoint(pos);
			pointFeature.attributes.gravatar = gravatarUrl(player.emailHash);

			console.log(positionsLayer, pointFeature);
			positionsLayer.addFeatures( [pointFeature] );
		});

		// var player = Players.findOne(Session.get('playerId'));

	});
});

Template.gravatar.url = function(){
	var player = Players.findOne(Session.get('playerId'));
	
	console.log('Template gravatar.url called', player);
	
	if (!player || !player.emailHash){
		return false;// don't return null, always return a default or you get errors.
	}

	return gravatarUrl(player.emailHash);
};

Template.gravatar.events({

	'click .save' : function (event, template) {

		var email = template.find('.email').value;

		if (email && email !== ''){
			var hash = $.md5(email);
			Players.update(Session.get('playerId'), {$set: { emailHash: hash }});
		}

		console.log(Players.findOne(Session.get('playerId')));
	}
});

function getCurrentUser() {
	return Players.findOne(Session.get('playerId'));
}

function gravatarUrl(hash) {
	return 'http://www.gravatar.com/avatar/' + hash;
}

var map;
var positionsLayer;

function initMap() {

	map = new OpenLayers.Map({});

	var gmap = new OpenLayers.Layer.Google("Google Streets");

	var ships = new OpenLayers.Layer.Vector();

	map.addLayers([gmap]);

	map.zoomToMaxExtent();

	// map.panTo(lonlat(-40, 46));

	map.render('map');

	addVectorLayer('peas');

	return map;
}

function lonlat(lon, lat) {

	var epsg4326 = new OpenLayers.Projection("EPSG:4326");

	var epsg900913 = new OpenLayers.Projection("EPSG:900913");

	var point =  new OpenLayers.LonLat(lon, lat).transform(epsg4326, epsg900913);

	return point;
}

function getCurrentPosition(){
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(pos){

			var clonePos = $.extend(true, {}, pos); // Fix FF error 'Cannot modify properties of a WrappedNative'
			clonePos.zoom = 11;
			Players.update(Session.get('playerId'), {$set: { position: clonePos }});

		}, error);
	} else {
		error('not supported');
	}
}

function addVectorLayer(name){

	positionsLayer = new OpenLayers.Layer.Vector(name, {
		projection: new OpenLayers.Projection('EPSG:4326'),
		styleMap: new OpenLayers.StyleMap({
			graphicWidth: 40,
			graphicHeight: 40,
			externalGraphic: '${gravatar}'
		})
	});

	map.addLayer(positionsLayer);
}

function createPoint(coords){

	var point = new OpenLayers.Geometry.Point(coords.lon, coords.lat);
    var pointFeature = new OpenLayers.Feature.Vector(point);
    return pointFeature;
}

function error(msg) {
	console.log(arguments);
}

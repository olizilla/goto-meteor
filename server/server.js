// if (Meteor.isServer) {
//   Meteor.startup(function () {
//     // code to run on server at startup
//   });
// }

Meteor.publish("allplayers", function(){
	return Players.find({});
});
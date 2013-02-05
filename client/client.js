/**
 * Every session gets a session id, and a tile on the board.
 * Mutiple sessions can have the same email address
 */

Meteor.startup(function () {
  console.log('startup');

  var retrieveOfCreatePlayerId = function(){

    var playerId = window.localStorage['playerId'];

    if (!playerId){
      playerId = Players.insert({email: null});
      window.localStorage['playerId'] = playerId;
    }

    Session.set('playerId', playerId);
  };

  // Do it.
  retrieveOfCreatePlayerId();
  
  Session.set('greeting', 'OH HAI');
});

Template.hello.greeting = function () {
  return Session.get('greeting');
};

Template.hello.avatarUrl = function(){
  var player = Players.findOne(Session.get('playerId'));
  if (!player){
    return "placeholder.png"; // don't return null, always return a default or you get errors.
  }
  var email = player.email;
  return toAvatarUrl(email);
};

Template.hello.events({

  'click .save' : function (event, template) {
    
    var email = template.find('.email').value;

    if (email && email !== ''){
      Players.update(Session.get('playerId'), { email: email });  
    }

    console.log(Players.findOne(Session.get('playerId')));
  }
  
});

function getCurrentUser() {
  return Players.findOne(Session.get('playerId'));
}

function toAvatarUrl(email) {
  hash = $.md5(email);
  return 'http://www.gravatar.com/avatar/' + hash;
}
[goto.meteor.com](http://goto.meteor.com)
=================

GOTO: A Meteor based, collections-centric experiment in geolocation and watching people arrive.

http://goto.meteor.com

## Meteor for the impatient

You can dump css files into the project and they automagically appear in the head in the rendered html. 
They are added in alphabetical order, and files in subdirectories are added before files in in the root. The deeper in the tree the earlier it loads.
So for example we could be super-louche and create a libs dir for all third party css & js... I dumped normalise.js in there and boom. it's loaded.

Put CSS & JS resources for the client in a dir called client. If you don't then your js libs will be processed on the server where there is no window object and cause an error. If you do, then all your libs and css will be automagically included in the head of your rendered html. The resrouces are automagically served with version info and cache headers for you dont have to think.

## Gotchas that got me

- Template methods used in the template, like grabbing the src for a gravatar url based on the current user, are called before
- Collections take some time to get populated. Add an explicit subscribe onComplete handler to only run code once the Collection is ready.
- Empty objects are removed from Collections. myCollection.insert({}) will insert succedfully and return an _id, but the object will immedietly be removed:https://github.com/meteor/meteor/issues/308

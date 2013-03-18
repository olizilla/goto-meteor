[goto.meteor.com](http://goto.meteor.com)
=================

GOTO: A Meteor based, collections-centric experiment in geolocation and watching people arrive.

For the [Meteor London](http://www.meetup.com/Meteor-London/) gang...

![GOTO Screenshot](https://raw.github.com/olizilla/goto-meteor/master/public/docs/goto-screenshot-2.png)

http://goto.meteor.com 


Meteor.settings.public.center = "{"lat":51.50532341149335,"lng":-0.186767578125,"zoom":10}"

# Meteor for the impatient

You can dump css files into the project and they automagically appear in the head in the rendered html. 
They are added in alphabetical order, and files in subdirectories are added before files in in the root. The deeper in the tree the earlier it loads.
So for example we could be super-louche and create a libs dir for all third party css & js... I dumped normalise.js in there and boom. it's loaded.

Put CSS & JS resources for the client in a dir called client. If you don't then your js libs will be processed on the server where there is no window object and cause an error. If you do, then all your libs and css will be automagically included in the head of your rendered html. The resrouces are automagically served with version info and cache headers for you dont have to think.

## Deploying to meteor.com

	meteor deploy [sitename] --password

Will prompt you to choose a password, bundle up your app and deploy it to `sitename.meteor.com`

The hosting is currently a freebee, and while they work out a fulll auth system, it's just password protected at the moment. If you leave off the `--password` then anyone can overwrite your app. If you just want a quick throw away test then that might be what you want.

	meteor deploy [sitename] --password --settings [settings.json]

Will create a `Meteor.settings` property that allows you to pass secrets and config to your app at deploy time.
If you add a `public` property to that json object, then the properties for the public object will be available on the client too.

```json
{
	"public":{
		"center":{
			"lat":51.50532341149335,
			"lng":-0.186767578125,
			"zoom":10
		}
	}
}
```

## Gotchas that got me

- Template methods used in the template, like grabbing the src for a gravatar url based on the current user, are called before
- Collections take some time to get populated. Add an explicit subscribe onComplete handler to only run code once the Collection is ready.
- Empty objects are removed from Collections. myCollection.insert({}) will insert succedfully and return an _id, but the object will immedietly be removed:https://github.com/meteor/meteor/issues/308
- `Players.remove({position: undefined});` removed everyone while `Players.find({position: undefined}).fetch();` pulled the list of records that had no position. SUPRISE! I DELETE ALL URE DATAZ... Thanks mongo. 
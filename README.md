README
======

Put client resources like css and js libs into the client dir.


## Meteor for the impatient

you can dump additional css files into the project and they automagically appear in the head in the rendered html
they are added in alphabetical order, and files in subdirectories are added before files in in the root. The deeper in the tree the earlier it loads.

so for example we could be super luche and create a libs dir for all third party css & js... I dumped normalise.js in there and boom. it's loaded.

Put CSS & JS resources for the client in a dir called client. If you don't then your js libs will be processed on the server where there is no window object and cause an error. If you do, then all your libs and css will be automagically included in the head of your rendered html. The resrouces are automagically served with version info and cache headers for you dont have to think.


## Gotchas that got me

- Template methods used in the template, like grabbing the src for a gravatar url based on the current user, are called before 
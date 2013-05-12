#!/bin/bash
# Create optimised CSS
cat `php index.php | fgrep -i 'rel="stylesheet"' | sed 's/<link rel="stylesheet" type="text\/css" href="//' | sed 's/\?.*//' | sed '/^$/d'`> css/tmp.css
#yui-compressor -o css/out.css css/tmp.css
cp css/tmp.css css/all.css
rm css/tmp.css

# Create optimised JavaScript
if [ "$#" -eq "1" ]
then
    # don't add cordova for standalone
    echo No cordova in this build
else
    cat lib/js/cordova-2.7.0.js > js/all.js
    cat lib/js/barcodescanner.js >> js/all.js
    echo Compiled Cordova into this build
fi
cat `php index.php | fgrep -i '<script type="text/javascript" src' | sed 's/.* src=\"//' | sed 's/\?.*//' ` >> js/all.js

# Insert optimised CSS
VER=`git describe --abbrev=0`
echo $VER
php index.php | fgrep -v 'rel="stylesheet"' | sed 's/charset=utf-8">/charset=utf-8">\
        <link rel="stylesheet" href="css\/all.css" \/>/' \
        | sed "s/###VERSION###/v0.$VER/"  > index.tmp

# Insert optimised JavaSCript
cat index.tmp | fgrep -v '<script type="text/javascript" src' | sed 's/<\/body>/<script type="text\/javascript" src="js\/all.js"><\/script><\/body>/' > index.html

rm index.tmp

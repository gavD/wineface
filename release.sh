#!/bin/bash
cordova/clean
pushd `pwd`/assets/www
VER=`git describe --abbrev=0`
./compile.sh
popd
cordova/release
pushd `pwd`/bin
jarsigner -verbose -sigalg MD5withRSA -digestalg SHA1 -keystore my-release-key.keystore -sigalg MD5withRSA -digestalg SHA1 -keystore ../my-release-key.keystore  wineface-release-unsigned.apk wineface
cp wineface-release-unsigned.apk wineface-$VER.apk
jarsigner -verify -verbose -certs wineface-$VER.apk
popd
echo Built version $VER
echo `pwd`/bin/wineface-$VER.apk | xclip -selection clipboard
rm `pwd`/assets/www/index.html

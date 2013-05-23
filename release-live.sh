#!/bin/bash
cordova/clean
pushd `pwd`/assets/www
VER=`git describe --abbrev=0`
./compile.sh
popd
cordova/release
pushd `pwd`/bin
jarsigner -verbose -sigalg MD5withRSA -digestalg SHA1 -keystore my-release-key.keystore -sigalg MD5withRSA -digestalg SHA1 -keystore ../my-release-key.keystore  WineFace-release-unsigned.apk WineFace
cp WineFace-release-unsigned.apk WineFace-$VER.apk
jarsigner -verify -verbose -certs WineFace-$VER.apk
popd
echo Built version $VER
echo `pwd`/bin/WineFace-$VER.apk | xclip -selection clipboard
rm `pwd`/assets/www/index.html
zipalign -f -v 4 `pwd`/bin/WineFace-$VER.apk bin/WineFace-al-$VER.apk

#!/bin/bash
cordova/clean
pushd `pwd`/assets/www
VER=`git describe --abbrev=0`
./compile.sh
popd
cordova/release
pushd `pwd`/bin
jarsigner -verbose -sigalg MD5withRSA -digestalg SHA1 -keystore my-release-key.keystore -sigalg MD5withRSA -digestalg SHA1 -keystore ../my-release-key.keystore  fhsurveyor-release-unsigned.apk fhsurveyor
cp fhsurveyor-release-unsigned.apk fhsurveyor-$VER.apk
jarsigner -verify -verbose -certs fhsurveyor-$VER.apk
popd
echo Built version $VER
echo `pwd`/bin/fhsurveyor-$VER.apk | xclip -selection clipboard
rm `pwd`/assets/www/index.html

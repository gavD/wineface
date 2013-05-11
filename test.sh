#!/bin/bash
pushd `pwd`/assets/www
./compile.sh
popd
cordova/clean
cordova/run
rm `pwd`/assets/www/index.html

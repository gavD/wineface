/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
//var app = {
//    // Application Constructor
//    initialize: function() {
//        this.bindEvents();
//    },
//    // Bind Event Listeners
//    //
//    // Bind any events that are required on startup. Common events are:
//    // 'load', 'deviceready', 'offline', and 'online'.
//    bindEvents: function() {
//        document.addEventListener('deviceready', this.onDeviceReady, false);
//    },
//
//    // deviceready Event Handler
//    //
//    // The scope of 'this' is the event. In order to call the 'receivedEvent'
//    // function, we must explicity call 'app.receivedEvent(...);'
//    onDeviceReady: function() {
//        app.receivedEvent('deviceready');
//
//        alert("Device is ready");
//    },
//
//    // Update DOM on a Received Event
//    receivedEvent: function(id) {
//
//        var parentElement = document.getElementById(id);
//        var listeningElement = parentElement.querySelector('.listening');
//        var receivedElement = parentElement.querySelector('.received');
//
//        listeningElement.setAttribute('style', 'display:none;');
//        receivedElement.setAttribute('style', 'display:block;');
//
//        console.log('Received Event: ' + id);
//    }
//};
//app.initialize();

// todo wrap in closure

    var barcode = null;

    function takePhoto(tmpBarcode) {
        barcode = tmpBarcode;
        takePhotoInner();
    }

    function takePhotoInner() { // TODO rename this
        function onSuccess(imagePath) {
            window.localStorage.setItem(barcode, imagePath);
            showPhoto(barcode);
            $('#thisWasYourFace').html('Here is your reaction to this wine!');
        }

        function onFail(message) {
            alert('Failed because: ' + message);
        }

        navigator.camera.getPicture(onSuccess, onFail,
            { quality: 100,
              destinationType: Camera.DestinationType.FILE_URI,
              sourceType: navigator.camera.PictureSourceType.CAMERA,
              encodingType: navigator.camera.EncodingType.JPEG,
              cameraDirection: navigator.camera.Direction.FRONT // seems to have no effect
            }
        );
    }

    function showPhoto(barcode) {
        $('#face').attr('src', window.localStorage.getItem(barcode));
        $('#faceWrapper').show();
    }

    function scanLabel() {
        if(typeof window.plugins == 'undefined'
            || typeof window.plugins.barcodeScanner == 'undefined'
        ) {
            alert('Unavailable in web client');
        } else {
            $('#faceWrapper').hide();

            window.plugins.barcodeScanner.scan(
                function(result) {
                    console.log("Scanned barcode " + result.text);
                    if(window.localStorage.getItem(result.text) === null) {
                        $('#faceNotes').hide();
                        takePhoto(result.text);
                    } else {
                        $('#faceNotes').html('This was your face last time you drank this!');
                        showPhoto(result.text);
                    }
                }, function(error) {
                    alert("Scanning failed: " + error);
                }
            );
        }
    }

    $('#btnScan').click(function() {
        scanLabel();
    });

    // barcode is known, so take the photograph
    $('#btnRetake').click(function() {
        takePhotoInner();
    });

    $('#btnHelp').click(function() {
        $('#content').hide();
        $('#instructions').show();
    });

    $('#btnHelpRead').click(function() {
        $('#instructions').hide();
        $('#content').show();
    });

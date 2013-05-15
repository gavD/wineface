<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8" />
        <meta name="format-detection" content="telephone=no" />
        <meta http-equiv="Content-type" content="text/html; charset=utf-8">
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=1" />
        <link rel="stylesheet" type="text/css" href="lib/initializr-verekia-4.0/initializr/css/normalize.min.css?<?php echo rand();?>" />
        <link rel="stylesheet" type="text/css" href="css/index.css?<?php echo rand();?>" />
        <title>WineFace</title>
    </head>
    <body>
        <div id="wrapper">
            <div id="header">
                WineFace ###VERSION###
            </div>
            <div id="content">
                <button id="btnScan" title="Scan a bottle of wine. If you've scanned that type of wine before, you'll see your reaction to the wine!">Scan barcode on bottle</button>

                <div id="faceWrapper">
                    <p id="faceNotes">This was your face last time you drank this!</p>
                    <button id="btnScanAgain" title="If you don't like this picture, use this!">Take new picture</button>
                    <img src="" id="face" alt="Your face will appear here" />
                </div>

                <button id="btnHelp" title="If you're stuck or want to know more!">Help and info</button>
            </div>

            <div id="instructions">

                    <p>
                        Trouble remembering what wines you like? Not any more! Simply scan the barcode and then make a face. Then, any time you scan that barcode in future, you'll see the face you made and know if you enjoyed it or not!
                    </p>

                    <p>
                        One button, nice and easy!
                    </p>

                    <p>WineFace by <a href="http://gavd.co.uk">Gavin Davies</a></p>

                    <button id="btnHelpRead">OK, got it!</button>
            </div>
        </div>

        <script type="text/javascript" src="lib/js/appframework/jq.mobi.min.js?<?php echo rand();?>"></script>
        <script type="text/javascript" src="js/index.js?<?php echo rand();?>"></script>
    </body>
</html>

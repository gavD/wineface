<DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8" />
        <meta name="format-detection" content="telephone=no" />
        <meta http-equiv="Content-type" content="text/html; charset=utf-8">
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=1">
        <link rel="stylesheet" type="text/css" href="lib/js/appframework/kitchensink/jq.ui.css?<?php echo rand();?>" />
        <link rel="stylesheet" type="text/css" href="lib/js/appframework/kitchensink/icons.css?<?php echo rand();?>" />
        <link rel="stylesheet" type="text/css" href="css/index.css?<?php echo rand();?>" />
        <title>WineFace</title>
    </head>
    <body>
        <div id="jQUi">
            <div id="header">
            </div>
            <div id="content">
                <div title='WineFace ###VERSION###' id="main" class="panel" selected="true">
                    <ul>
                        <li>
                            <a href="#" id="btnScan" class="icon target big">Scan barcode on bottle</a>
                        </li>
                    </ul>

                    <img width="100%" src="" id="face" />

                    <p class="instructions">
                        Trouble remembering what wines you like? Not any more! Simply scan the barcode and then make a face. Then, any time you scan that barcode in future, you'll see the face you made and know if you enjoyed it or not!<br/><br/>

                        One button, nice and easy!
                    </p>
                </div>
            </div>
        </div>

        <script type="text/javascript" src="lib/js/appframework/ui/jq.ui.min.js?<?php echo rand();?>"></script>
        <script type="text/javascript" src="js/index.js?<?php echo rand();?>"></script>
    </body>
</html>

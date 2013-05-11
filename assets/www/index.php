star!<DOCTYPE html>

<html>
    <head>
        <meta charset="utf-8" />
        <meta name="format-detection" content="telephone=no" />
        <meta http-equiv="Content-type" content="text/html; charset=utf-8">
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=1">
        <link rel="stylesheet" type="text/css" href="lib/js/appframework/kitchensink/jq.ui.css?<?php echo rand();?>" />
        <title>WineFace</title>
    </head>
    <body>
        <div id="jQUi">
            <div id="header">
                <a href="javascript:$.ui.toggleSideMenu()" class="button" style="float:right">Scan bottle</a>
            </div>
            <div id="content">
                <div title='WineFace' id="main" class="panel" selected="true">
                    <h1>Welcome to WineFace!</h1>
                    <p>Trouble remembering what wines you like? Not any more! Simply scan the barcode and then make a face. Then, any time you scan that barcode in future, you'll see the face you made and know if you enjoyed it or not!</p>

                    <p>One button, nice and easy!</p>
                </div>
                <div title='Welcom2e' id="main2" class="panel">
                    This is a basic skeleton UI sample2
                </div>
            </div>
            <div id="navbar">
                <div class="horzRule"></div>
                <a href="#main" id='navbar_home' class='icon home'>home</a>
            </div>
            <nav>
                <div class='title'>Home</div>
                <ul>
                    <li >
                        <a class="icon home mini" href="#main">Selectors</a>
                        <a class="icon home mini" href="#main2">Selectors</a>
                    </li>
                </ul>
            </nav>
        </div>

        <script type="text/javascript" src="lib/js/appframework/ui/jq.ui.min.js?<?php echo rand();?>"></script>
    </body>
</html>

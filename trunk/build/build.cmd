@echo off

set YUI_COMPRESSOR_PATH=C:\yuicompressor-2.4.2
set SMART_SPRITES_PATH=C:\smartsprites

echo ========Building zVisualizer distribution========

echo cleaning dist directory
erase /Q ..\dist\*.*

echo Minifying JS using YUI Compressor
java -jar %YUI_COMPRESSOR_PATH%\build\yuicompressor-2.4.2.jar -o ..\dist\bookmarklet.min.js ..\src\bookmarklet.js
java -jar %YUI_COMPRESSOR_PATH%\build\yuicompressor-2.4.2.jar -o zviz.min.js ..\src\zviz.js
rem copy ..\src\zviz.js zviz.min.js

echo Concat JS files
set MERGE_FILE=zviz-merge.js
type ..\lib\jquery-1.3.2.min.js > %MERGE_FILE%
echo. >> %MERGE_FILE%
type ..\lib\jquery-ui-1.7.2.custom.min.js >> %MERGE_FILE%
echo. >> %MERGE_FILE%
type ..\lib\jquery.browser.min.js >> %MERGE_FILE%
echo. >> %MERGE_FILE%
type ..\lib\jquery.hotkeys-0.7.8-packed.js >> %MERGE_FILE%
echo. >> %MERGE_FILE%
type ..\lib\jquery.tooltip.min.js >> %MERGE_FILE%
echo. >> %MERGE_FILE%
type zviz.min.js >> %MERGE_FILE%
move %MERGE_FILE% ..\dist\zviz.dist.js
erase zviz.min.js

echo Running SmartSprites
for /f "usebackq delims=" %%i in (`cd`) do set buildDir=%%i
pushd %SMART_SPRITES_PATH%
call smartsprites.cmd --root-dir-path %buildDir%\..\src --output-dir-path %buildDir%\..\dist
popd

echo Minifying CSS using YUI Compressor
java -jar %YUI_COMPRESSOR_PATH%\build\yuicompressor-2.4.2.jar -o ..\dist\zviz.min.css ..\dist\zviz-sprite.css
erase ..\dist\zviz-sprite.css

echo ======== zVisualizer distribution built successfully ========

rmdir archives /s/q
mkdir archives

xcopy ..\..\app.js archives
xcopy ..\..\package.json archives
robocopy ..\..\apps archives\apps /E
robocopy ..\..\inc archives\inc /E
robocopy ..\..\node_modules archives\node_modules /E
robocopy ..\..\routes archives\routes /E
robocopy ..\..\views archives\views /E

curl --output archives/node.exe https://gitlab.edgecenter.io/edgesense-open/nodejs-binary/-/raw/node-v12.14.0-win-x86/node.exe
curl --output archives/advsc.exe https://gitlab.edgecenter.io/edgesense-open/advsc-binary/-/raw/master/win-x86/1.0.1/advsc.exe
xcopy ..\advsc.ini archives

pause

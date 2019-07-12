rmdir ..\archives /s/q
mkdir ..\archives

xcopy ..\..\app.js ..\archives
xcopy ..\..\package.json ..\archives
robocopy ..\..\apps ..\archives\apps /E
robocopy ..\..\inc ..\archives\inc /E
robocopy ..\..\node_modules ..\archives\node_modules /E
robocopy ..\..\routes ..\archives\routes /E
robocopy ..\..\views ..\archives\views /E

xcopy misc\install.js ..\archives
xcopy misc\install_apigw.bat ..\archives
xcopy misc\node.exe ..\archives
xcopy misc\uninstall.js ..\archives
xcopy misc\uninstall_apigw.bat ..\archives

pause
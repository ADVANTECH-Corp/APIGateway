@ECHO OFF
SET ROOTDIR=%1%
CD %ROOTDIR%
@node.exe uninstall.js

:remove_meta
@REM delete meta files while using node-windows

@IF EXIST daemon\apigw.exe (
  @DEL /Q /S /F daemon\apigw.exe
  goto remove_meta
)

@IF EXIST daemon\apigw.exe.config (
  @DEL /Q /S /F daemon\apigw.exe.config
  goto remove_meta
)

@rmdir /s /q daemon

exit 0
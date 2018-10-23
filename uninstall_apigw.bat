@ECHO OFF
SET ROOTDIR=%1%
CD %ROOTDIR%
@node.exe uninstall.js

:remove_meta
@REM delete meta files while using node-windows

@IF EXIST daemon\apigateway.exe (
  @DEL /Q /S /F daemon\apigateway.exe
  goto remove_meta
)

@IF EXIST daemon\apigateway.exe.config (
  @DEL /Q /S /F daemon\apigateway.exe.config
  goto remove_meta
)

@rmdir /s /q daemon

exit 0
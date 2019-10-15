# Service Operation

## Service Operation for Linux

enable service
>sudo systemctl enable API-GW.service

start service
>sudo systemctl start API-GW.service

stop service
>sudo systemctl stop API-GW.service

check service status
>sudo systemctl status API-GW.service

# Development

## Change Version
1. Edit app.js
> global.AppVersion = 'x.x.x';

2. Edit installer/Ubuntu/ePack_conf/ePack_custom.bash
> PROJECT_VER=x.x.x

3. Using Advanced Installer to open installer/Windows/APIGateway.aip and edit ProductVersion.

## Build installer for Windows
1. Run installer/Windows/archives.bat
2. Using Advanced Installer to open installer/Windows/APIGateway.aip and build

## Build installer for Ubuntu
```sh
cd installer/Ubuntu
./archives.bash
./pack.bash
```

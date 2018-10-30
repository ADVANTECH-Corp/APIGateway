# APIGateway
Advantech iGateway RESTful API Gateway

## Setup
Install to system, default path is /usr/local/EdgeSense/API-GW
>sudo make install

or assign destination dir to be installed
>make install DESTDIR=/home/adv/rootfs

## Service operation
enable service
>sudo systemctl enable API-GW.service

start service
>sudo systemctl start API-GW.service

stop service
>sudo systemctl stop API-GW.service

check service status
>sudo systemctl status API-GW.service

## Development

### Change Version
1. Edit app.js
> global.AppVersion = 'x.x.x';

2. Edit ePack_conf/ePack_custom.bash
> PROJECT_VER=x.x.x

3. Using Advanced Installer to open installer/project/APIGateway.aip and edit ProductVersion.

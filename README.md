# APIGateway
Advantech iGateway RESTful API Gateway

Install to system
>sudo make install

or assign destination dir to be installed
>make install DESTDIR=/home/adv/rootfs

enable service
>sudo systemctl enable apigw.service

start service
>sudo systemctl start apigw.service

stop service
>sudo systemctl stop apigw.service

check service status
>sudo systemctl status apigw.service

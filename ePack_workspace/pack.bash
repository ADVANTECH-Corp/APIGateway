#!/bin/bash
WORKSPACE=$(cd $(dirname $0) && pwd)

git clone http://advgitlab.eastasia.cloudapp.azure.com/EdgeSense/ePack

cp -f ePack_custom.bash startup_custom.bash ePack

cd ..
make install DESTDIR=${WORKSPACE}/ePack/rootfs

cd ${WORKSPACE}/ePack
./build.bash

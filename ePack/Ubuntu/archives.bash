#!/bin/bash
PROJECT_TOP=$(cd "$(dirname "$1")/../.."; pwd)

ARCHIVES_TOP=${PROJECT_TOP}/ePack/archives
INS_ROOTFS=${ARCHIVES_TOP}/rootfs
DESTDIR=${INS_ROOTFS}/usr/local/EdgeSense/API-GW

CURRDIR=$(cd $(dirname $0) && pwd)

rm -rf ${ARCHIVES_TOP} || exit 1
mkdir -p ${ARCHIVES_TOP} || exit 1
mkdir -p ${INS_ROOTFS} || exit 1
mkdir -p ${DESTDIR} || exit 1
mkdir -p ${INS_ROOTFS}/etc/systemd/system || exit 1

# copy epack config
cd ${CURRDIR} || exit 1
cp -f ePack_conf/ePack_custom.bash ${ARCHIVES_TOP} || exit 1
cp -f ePack_conf/startup_custom.bash ${ARCHIVES_TOP} || exit 1

# copy project files
cd ${PROJECT_TOP} || exit 1
cp -rf app.js inc node_modules routes views apps package.json ${DESTDIR} || exit 1

# copy misc
cd ${CURRDIR} || exit 1
cp -f misc/API-GW.service ${INS_ROOTFS}/etc/systemd/system || exit 1
cp -f misc/uninstall.bash ${DESTDIR} || exit 1

echo "done"

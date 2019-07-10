#!/bin/bash
EPACK_PATH=
PROJECTDIR=../..
INS_ROOTFS=${EPACK_PATH}/archive/rootfs
DESTDIR=${INS_ROOTFS}/usr/local/EdgeSense/API-GW

CURRDIR=$(cd $(dirname $0) && pwd)

function epack_init() {
    if [ -z "${EPACK_PATH}" ]; then
        echo "Please define ePack path"
        exit 1
    fi

    cd ${EPACK_PATH} || exit 1
    ./clean_archive.bash || exit 1
}

function install_epack_conf() {
    cd ${CURRDIR} || exit 1
    cp -f ePack_conf/ePack_custom.bash ${EPACK_PATH}/archive || exit 1
    cp -f ePack_conf/startup_custom.bash ${EPACK_PATH}/archive || exit 1
}

function install_project() {
    cd ${PROJECTDIR} || exit 1
    mkdir -p ${DESTDIR} || exit 1
    cp -rf app.js inc node_modules routes views apps package.json ${DESTDIR} || exit 1
}

function install_misc() {
    cd ${CURRDIR} || exit 1
    mkdir -p ${INS_ROOTFS}/etc/systemd/system || exit 1
    cp -f misc/API-GW.service ${INS_ROOTFS}/etc/systemd/system || exit 1
    mkdir -p ${DESTDIR} || exit 1
    cp -f misc/uninstall.bash ${DESTDIR} || exit 1
#    cp -f /usr/bin/node ${DESTDIR} || exit 1
}

function epack_run() {
    cd ${EPACK_PATH} || exit 1
    ./build.bash
}

epack_init
install_epack_conf
install_project
install_misc
epack_run

echo "done"

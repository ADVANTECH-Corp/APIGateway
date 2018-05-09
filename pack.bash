#!/bin/bash
EPACK_PATH=

if [ -z "${EPACK_PATH}" ]; then
    echo "Please define ePack path"
    exit 1
fi

cp -f ePack_conf/ePack_custom.bash ${EPACK_PATH}/archive || exit 1
cp -f ePack_conf/startup_custom.bash ${EPACK_PATH}/archive || exit 1

make install DESTDIR=${EPACK_PATH}/archive/rootfs || exit 1

cd ${EPACK_PATH} || exit 1
./build.bash

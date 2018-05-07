#!/bin/bash
EPACK_PATH=

if [ -z "${EPACK_PATH}" ]; then
    echo "Please define ePack path"
    exit 1
fi

cp -f ePack_custom.bash startup_custom.bash ${EPACK_PATH} || exit 1

cd ..
make install DESTDIR=${EPACK_PATH}/rootfs || exit 1

cd ${EPACK_PATH} || exit 1
./build.bash

#!/bin/bash
EPACK_PATH=
PROJECT_ARCHIVES=$(cd "$(dirname "$1")/../.."; pwd)/ePack/archives

CURRDIR=$(cd $(dirname $0) && pwd)

if [ -z "${EPACK_PATH}" ]; then
    echo "Please define ePack path"
    exit 1
fi

cd ${EPACK_PATH} || exit 1
./clean_archive.bash || exit 1

cp -R -a -f ${PROJECT_ARCHIVES}/* ${EPACK_PATH}/archive || exit 1

cd ${EPACK_PATH}
./build.bash

echo "done"

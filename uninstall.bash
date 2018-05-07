#!/bin/bash
PROJECT_NAME=API-GW
INS_DIR=/usr/local/EdgeSense/${PROJECT_NAME}
SERVICE_NAME=${PROJECT_NAME}.service

function remove_service ()
{
    if [ ! -z "${PROJECT_NAME}" ] && [ ! -z "${SERVICE_NAME}" ]; then
        if [ -e /etc/systemd/system/${SERVICE_NAME} ]; then
            systemctl stop ${SERVICE_NAME}
            systemctl disable ${SERVICE_NAME}
            rm -f --preserve-root /etc/systemd/system/${SERVICE_NAME}
        fi
        echo "remove_service ... done"
    fi
}

function remove_project ()
{
    if [ ! -z "${PROJECT_NAME}" ] && [ ! -z "${INS_DIR}" ]; then
        rm -rf --preserve-root ${INS_DIR} || exit 1
        echo "remove_project ... done"
    fi
}

function remove_others ()
{
    echo "remove_others ... done"
}

echo "uninstall ${PROJECT_NAME} ..."
remove_service
remove_project
remove_others
echo "uninstall ${PROJECT_NAME} ... done"

#!/bin/bash

# Custom Section
PROJECT_NAME=API-GW
INS_DIR=/usr/local/EdgeSense/${PROJECT_NAME}
UNINSTALL_SCRIPT_NAME=uninstall.bash
UNINSTALL_SCRIPT_PATH=${INS_DIR}/${UNINSTALL_SCRIPT_NAME}
SERVICE_NAME=${PROJECT_NAME}.service
#CONF_FILE_NAME=settings.ini
#CONF_FILE_PATH=${INS_DIR}/${CONF_FILE_NAME}

function install_dependency ()
{
    # Custom Section
    echo "install_dependency"
}

function backup_config ()
{
    # Custom Section
    echo "backup_config"
#    rm -f /tmp/${CONF_FILE_NAME} || exit 1
#    if [ -f $CONF_FILE_PATH ]; then
#        echo "backup $CONF_FILE_PATH to /tmp"
#        cp -f $CONF_FILE_PATH /tmp || exit 1
#    fi
}

function restore_config ()
{
    # Custom Section
    echo "restore_config"
#    if [ -f /tmp/$CONF_FILE_NAME ]; then
#        echo "restore $CONF_FILE_NAME to $CONF_FILE_PATH"
#        mv -f /tmp/$CONF_FILE_NAME $CONF_FILE_PATH || exit 1
#    fi
}

function install_others ()
{
    # Custom Section
    echo "install_others"
}


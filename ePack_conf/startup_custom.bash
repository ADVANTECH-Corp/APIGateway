#!/bin/bash

# Custom Section
PROJECT_NAME=API-GW
INS_DIR=/usr/local/EdgeSense/${PROJECT_NAME}
SERVICE_NAME=${PROJECT_NAME}.service

function install_dependency ()
{
    sudo apt -y install nodejs
    return
}

function backup_config ()
{
    return
}

function restore_config ()
{
    return
}

function install_others ()
{
    return
}

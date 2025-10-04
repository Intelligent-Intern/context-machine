#!/bin/bash

source infra/scripts/utils/messages.sh || { echo "messages.sh missing"; exit 1; }
source infra/scripts/utils/progress.sh || { echo "progress.sh missing"; exit 1; }

info "deleting the data folders"
sudo rm -rf infra/n8n/data
sudo rm -rf infra/minio/data
sudo rm -rf infra/rabbitmq/data
success "done"

#!/bin/bash
set -euo pipefail

source infra/scripts/utils/messages.sh

# optional: show what will be removed
docker ps -a | grep -E 'context-machine' || true
docker rm -f $(docker ps -aq --filter name=context-machine) 2>/dev/null || true

docker volume prune -f >/dev/null
docker network prune -f >/dev/null

# Ensure local data dirs exist
mkdir -p infra/minio/data
mkdir -p infra/n8n/data
mkdir -p infra/neo4j/data
mkdir -p infra/rabbitmq/data

info "Starting services..."
# --build here is safe; with cache + existing image it won’t pull
docker compose up -d --build

# Bring up infra pieces
./infra/scripts/utils/setup-minio.sh
./infra/scripts/utils/setup-rabbitmq.sh
./infra/scripts/utils/setup-minio-event.sh
./infra/scripts/utils/setup-n8n.sh || true

system_up

# Print usage summary (if you have it)
if [ -f ./infra/scripts/utils/usage.sh ]; then
  ./infra/scripts/utils/usage.sh || true
fi

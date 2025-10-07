#!/usr/bin/env bash
set -euo pipefail

source infra/scripts/utils/messages.sh || { echo "messages.sh missing"; exit 1; }

docker ps -a | grep -E 'context-machine' || true
docker rm -f $(docker ps -aq --filter name=context-machine) 2>/dev/null || true

docker volume prune -f >/dev/null
docker network prune -f >/dev/null

mkdir -p infra/minio/data
mkdir -p infra/n8n/data
mkdir -p infra/neo4j/data
mkdir -p infra/rabbitmq/data
mkdir -p infra/ollama
mkdir -p infra/openwebui
sudo mkdir -p ./infra/gitea/data/git/.ssh
touch ./infra/gitea/data/git/.ssh/authorized_keys.tmp
sudo chown -R 1000:1000 ./infra/gitea/data
sudo chmod -R 755 ./infra/gitea/data

./infra/scripts/utils/container-utils.sh

info "Starting services..."
docker compose up -d --build

./infra/scripts/utils/setup-minio.sh
./infra/scripts/utils/setup-rabbitmq.sh
./infra/scripts/utils/setup-minio-event.sh
./infra/scripts/utils/setup-n8n.sh || true
./infra/scripts/utils/setup-gitea.sh 
./infra/scripts/utils/setup-ollama.sh 

system_up

if [ -f ./infra/scripts/utils/usage.sh ]; then
  ./infra/scripts/utils/usage.sh || true
fi

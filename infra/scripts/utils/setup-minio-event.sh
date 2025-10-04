#!/bin/bash
set -euo pipefail

source infra/scripts/utils/messages.sh || { echo "messages.sh missing"; exit 1; }
source infra/scripts/utils/progress.sh || { echo "progress.sh missing"; exit 1; }

info "Configuring MinIO AMQP notifications..."

if [ -f .env.local ]; then
  set -a
  . .env.local
  set +a
fi

: "${MINIO_ROOT_USER:?MINIO_ROOT_USER is required (set in .env.local)}"
: "${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD is required (set in .env.local)}"
: "${MINIO_BUCKET:?MINIO_BUCKET is required (set in .env.local)}"
: "${RABBITMQ_DEFAULT_USER:?RABBITMQ_DEFAULT_USER is required (set in .env.local)}"
: "${RABBITMQ_DEFAULT_PASS:?RABBITMQ_DEFAULT_PASS is required (set in .env.local)}"
: "${RABBITMQ_EXCHANGE:?RABBITMQ_EXCHANGE is required (set in .env.local)}"
: "${RABBITMQ_ROUTING_KEY:?RABBITMQ_ROUTING_KEY is required (set in .env.local)}"

NETWORK_NAME="context-machine_context-machine-network"
SERVICE_HOST="minio:9000"
MC_IMAGE="minio/mc:latest"
WAIT_SECS=15

info "Waiting for MinIO (${WAIT_SECS}s)"
if progress_bar "$WAIT_SECS" \
   "docker run --rm --network $NETWORK_NAME \
       -e MC_HOST_minio=http://${MINIO_ROOT_USER}:${MINIO_ROOT_PASSWORD}@$SERVICE_HOST \
       $MC_IMAGE ls minio"; then
  info "MinIO API is reachable."
else
  error "MinIO API not reachable within ${WAIT_SECS}s."
  echo "---- Last MinIO log output ----"
  docker logs context-machine-minio 2>/dev/null | tail -n 40 || true
  echo "--------------------------------"
  exit 1
fi

info "Setting AMQP config in MinIO..."
docker run --rm --network "$NETWORK_NAME" \
  -e MC_HOST_minio="http://${MINIO_ROOT_USER}:${MINIO_ROOT_PASSWORD}@${SERVICE_HOST}" \
  $MC_IMAGE admin config set minio notify_amqp:primary \
    url="amqp://${RABBITMQ_DEFAULT_USER}:${RABBITMQ_DEFAULT_PASS}@context-machine-rabbitmq:5672" \
    exchange="$RABBITMQ_EXCHANGE" \
    exchange_type="direct" \
    routing_key="$RABBITMQ_ROUTING_KEY" \
    durable="on"

info "Restarting MinIO to apply AMQP config..."
docker restart context-machine-minio >/dev/null
success "MinIO restarted successfully."

info "Removing any existing overlapping AMQP event rules..."
docker run --rm --network "$NETWORK_NAME" \
  -e MC_HOST_minio="http://${MINIO_ROOT_USER}:${MINIO_ROOT_PASSWORD}@${SERVICE_HOST}" \
  $MC_IMAGE event remove minio/$MINIO_BUCKET arn:minio:sqs::primary:amqp --event put >/dev/null 2>&1 || true

info "Adding event binding for bucket '${MINIO_BUCKET}'..."
docker run --rm --network "$NETWORK_NAME" \
  -e MC_HOST_minio="http://${MINIO_ROOT_USER}:${MINIO_ROOT_PASSWORD}@${SERVICE_HOST}" \
  $MC_IMAGE event add minio/$MINIO_BUCKET arn:minio:sqs::primary:amqp --event put

success "MinIO AMQP notifications configured successfully (bucket=${MINIO_BUCKET}, exchange=${RABBITMQ_EXCHANGE}, routing_key=${RABBITMQ_ROUTING_KEY})."

#!/bin/bash
set -euo pipefail

source infra/scripts/utils/messages.sh || { echo "messages.sh missing"; exit 1; }
source infra/scripts/utils/progress.sh || { echo "progress.sh missing"; exit 1; }

info "Setting up MinIO bucket..."

# load env vars
if [ -f .env.local ]; then
  set -a
  . .env.local
  set +a
fi

: "${MINIO_ROOT_USER:?MINIO_ROOT_USER is required (set in .env.local)}"
: "${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD is required (set in .env.local)}"
: "${MINIO_BUCKET:?MINIO_BUCKET is required (set in .env.local)}"

NETWORK_NAME="context-machine_context-machine-network"
SERVICE_HOST="minio:9000"
MC_IMAGE="minio/mc:latest"
BUCKET="minio/${MINIO_BUCKET}"
WAIT_SECS=15

# wait until API reachable
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

# create bucket if missing
info "Checking bucket ${MINIO_BUCKET}..."
if docker run --rm --network "$NETWORK_NAME" \
    -e MC_HOST_minio="http://${MINIO_ROOT_USER}:${MINIO_ROOT_PASSWORD}@${SERVICE_HOST}" \
    $MC_IMAGE ls "$BUCKET" >/dev/null 2>&1; then
  info "Bucket '${MINIO_BUCKET}' already exists."
else
  info "Bucket does not exist — creating '${MINIO_BUCKET}'..."
  docker run --rm --network "$NETWORK_NAME" \
    -e MC_HOST_minio="http://${MINIO_ROOT_USER}:${MINIO_ROOT_PASSWORD}@${SERVICE_HOST}" \
    $MC_IMAGE mb "$BUCKET" --ignore-existing
  success "Bucket '${MINIO_BUCKET}' created successfully."
fi

success "MinIO bucket setup complete (no AMQP notifications yet)."

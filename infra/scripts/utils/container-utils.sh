#!/bin/bash
set -euo pipefail

source infra/scripts/utils/messages.sh || { echo "messages.sh missing"; exit 1; }

# ---------------------------------------------------------------------------
# Build Neo4j service
# ---------------------------------------------------------------------------
SERVICE_NAME="context-machine-neo4j-service"
SERVICE_PATH="./services/neo4j-service"
TAG="latest"

info "Building Docker image for ${SERVICE_NAME}..."
docker build -t "${SERVICE_NAME}:${TAG}" "${SERVICE_PATH}"

if docker image inspect "${SERVICE_NAME}:${TAG}" >/dev/null 2>&1; then
  success "Image ${SERVICE_NAME}:${TAG} built successfully."
else
  error "Image verification failed for ${SERVICE_NAME}:${TAG}."
  exit 1
fi

# ---------------------------------------------------------------------------
# Build Analyzer service
# ---------------------------------------------------------------------------
SERVICE_NAME_ANALYZER="context-machine-analyzer-service"
SERVICE_PATH_ANALYZER="./services/analyzer-service"
TAG_ANALYZER="latest"

info "Building Docker image for ${SERVICE_NAME_ANALYZER}..."
docker build -t "${SERVICE_NAME_ANALYZER}:${TAG_ANALYZER}" "${SERVICE_PATH_ANALYZER}"

if docker image inspect "${SERVICE_NAME_ANALYZER}:${TAG_ANALYZER}" >/dev/null 2>&1; then
  success "Image ${SERVICE_NAME_ANALYZER}:${TAG_ANALYZER} built successfully."
else
  error "Image verification failed for ${SERVICE_NAME_ANALYZER}:${TAG_ANALYZER}."
  exit 1
fi

# ---------------------------------------------------------------------------
# Build WebSocket service
# ---------------------------------------------------------------------------
SERVICE_NAME_WS="context-machine-websocket-service"
SERVICE_PATH_WS="./services/websocket-service"
TAG_WS="latest"

info "Building Docker image for ${SERVICE_NAME_WS}..."
docker build -t "${SERVICE_NAME_WS}:${TAG_WS}" "${SERVICE_PATH_WS}"

if docker image inspect "${SERVICE_NAME_WS}:${TAG_WS}" >/dev/null 2>&1; then
  success "Image ${SERVICE_NAME_WS}:${TAG_WS} built successfully."
else
  error "Image verification failed for ${SERVICE_NAME_WS}:${TAG_WS}."
  exit 1
fi

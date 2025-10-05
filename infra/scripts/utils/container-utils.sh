#!/bin/bash
set -euo pipefail

source infra/scripts/utils/messages.sh || { echo "messages.sh missing"; exit 1; }

info "Stopping and cleaning up existing containers..."
docker compose down -v --remove-orphans || true

# ---------------------------------------------------------------------------
# Build all services fresh (no cache)
# ---------------------------------------------------------------------------
SERVICE_NAME="context-machine-neo4j-service"
SERVICE_PATH="./services/neo4j-service"
TAG="latest"

SERVICE_NAME_ANALYZER="context-machine-analyzer-service"
SERVICE_PATH_ANALYZER="./services/analyzer-service"
TAG_ANALYZER="latest"

SERVICE_NAME_WS="context-machine-websocket-service"
SERVICE_PATH_WS="./services/websocket-service"
TAG_WS="latest"

info "Building all images from scratch (no cache)..."
docker build --no-cache -t "${SERVICE_NAME}:${TAG}" "${SERVICE_PATH}"
docker build --no-cache -t "${SERVICE_NAME_ANALYZER}:${TAG_ANALYZER}" "${SERVICE_PATH_ANALYZER}"
docker build --no-cache -t "${SERVICE_NAME_WS}:${TAG_WS}" "${SERVICE_PATH_WS}"

success "All service images rebuilt successfully."

# ---------------------------------------------------------------------------
# Start analyzer and neo4j service fresh
# ---------------------------------------------------------------------------
info "Starting Neo4j and Analyzer services..."
docker compose up -d analyzer-service neo4j-service

success "Services started successfully."


#!/bin/bash
set -euo pipefail

source infra/scripts/utils/messages.sh || { echo "messages.sh missing"; exit 1; }

info "Stopping and cleaning up existing containers..."
docker compose down -v --remove-orphans || true


# ---------------------------------------------------------------------------
# Build all services fresh (no cache)
# ---------------------------------------------------------------------------
TAG="latest"

# --- Neo4j ---------------------------------------------------------------
SERVICE_NAME_NEO4J="context-machine-neo4j-service"
SERVICE_PATH_NEO4J="./services/neo4j-service"

# --- Analyzer ------------------------------------------------------------
SERVICE_NAME_ANALYZER="context-machine-analyzer-service"
SERVICE_PATH_ANALYZER="./services/analyzer-service"

# --- Websocket -----------------------------------------------------------
SERVICE_NAME_WS="context-machine-websocket-service"
SERVICE_PATH_WS="./services/websocket-service"


info "Building all images from scratch (no cache)..."
docker build --no-cache -t "${SERVICE_NAME_NEO4J}:${TAG}" "${SERVICE_PATH_NEO4J}"
docker build --no-cache -t "${SERVICE_NAME_ANALYZER}:${TAG}" "${SERVICE_PATH_ANALYZER}"
docker build --no-cache -t "${SERVICE_NAME_WS}:${TAG}" "${SERVICE_PATH_WS}"

success "All service images rebuilt successfully."

# ---------------------------------------------------------------------------
# Start all core services fresh
# ---------------------------------------------------------------------------
info "Starting Neo4j, Analyzer, and Gitea services..."
docker compose up -d analyzer-service neo4j-service gitea

success "✅ All core services (Neo4j, Analyzer) started successfully."

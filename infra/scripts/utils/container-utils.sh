#!/bin/bash
set -euo pipefail

source infra/scripts/utils/messages.sh || { echo "messages.sh missing"; exit 1; }

MODE=${1:-up}  # Default to 'up' if no argument provided

if [ "$MODE" = "build" ]; then
    info "Building all service containers..."
else
    info "Stopping and cleaning up existing containers..."
    docker compose down -v --remove-orphans || true
fi


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

# --- MCP Service ---------------------------------------------------------
#SERVICE_NAME_MCP="context-machine-mcp-service"
#SERVICE_PATH_MCP="./services/mcp-service"

# --- Backend Service -----------------------------------------------------
SERVICE_NAME_BACKEND="context-machine-backend"
SERVICE_PATH_BACKEND="./services/backend"

# --- Frontend Service ----------------------------------------------------
SERVICE_NAME_FRONTEND="context-machine-frontend"
SERVICE_PATH_FRONTEND="./services/frontend"



if [ "$MODE" = "build" ]; then
    info "Building all images from scratch (no cache)..."
    docker build --no-cache -t "${SERVICE_NAME_NEO4J}:${TAG}" "${SERVICE_PATH_NEO4J}"
    docker build --no-cache -t "${SERVICE_NAME_ANALYZER}:${TAG}" "${SERVICE_PATH_ANALYZER}"
    docker build --no-cache -t "${SERVICE_NAME_WS}:${TAG}" "${SERVICE_PATH_WS}"
    # docker build --no-cache -t "${SERVICE_NAME_MCP}:${TAG}" "${SERVICE_PATH_MCP}"
    docker build --no-cache -t "${SERVICE_NAME_BACKEND}:${TAG}" "${SERVICE_PATH_BACKEND}"
    docker build --no-cache -t "${SERVICE_NAME_FRONTEND}:${TAG}" "${SERVICE_PATH_FRONTEND}"
    
    success "All service images built successfully."
else
    info "Building images (using cache if available)..."
    docker build -t "${SERVICE_NAME_NEO4J}:${TAG}" "${SERVICE_PATH_NEO4J}"
    docker build -t "${SERVICE_NAME_ANALYZER}:${TAG}" "${SERVICE_PATH_ANALYZER}"
    docker build -t "${SERVICE_NAME_WS}:${TAG}" "${SERVICE_PATH_WS}"
    # docker build -t "${SERVICE_NAME_MCP}:${TAG}" "${SERVICE_PATH_MCP}"
    docker build -t "${SERVICE_NAME_BACKEND}:${TAG}" "${SERVICE_PATH_BACKEND}"
    docker build -t "${SERVICE_NAME_FRONTEND}:${TAG}" "${SERVICE_PATH_FRONTEND}"
    
    success "All service images built successfully."
fi


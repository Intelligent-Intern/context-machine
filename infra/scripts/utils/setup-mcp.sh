#!/bin/bash
set -euo pipefail

source infra/scripts/utils/messages.sh || { echo "messages.sh missing"; exit 1; }
source infra/scripts/utils/progress.sh || { echo "progress.sh missing"; exit 1; }

info "Setting up MCP Service..."

# Load environment variables
if [ -f .env.local ]; then
  set -a
  . .env.local
  set +a
fi

CONTAINER="context-machine-mcp-service"
WAIT_SECS=15

# Wait for service to be ready
info "Waiting for MCP Service (${WAIT_SECS}s)"
if progress_bar "$WAIT_SECS" \
   "curl -f http://localhost:3003/health"; then
  info "MCP Service is ready."
else
  error "MCP Service not ready within ${WAIT_SECS}s."
  docker logs "$CONTAINER" 2>/dev/null | tail -n 40 || true
  exit 1
fi

success "MCP Service setup complete."
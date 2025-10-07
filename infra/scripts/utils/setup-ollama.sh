#!/bin/bash
set -euo pipefail

# -----------------------------------------------------------------------------
# Ollama setup script for Context Machine
# Ensures the Ollama container is running and required models are available.
# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# Load message helpers
# -----------------------------------------------------------------------------
if [ ! -f infra/scripts/utils/messages.sh ]; then
  echo "ERROR: messages.sh missing — aborting Ollama setup."
  exit 1
fi
source infra/scripts/utils/messages.sh

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
CONTAINER_NAME="context-machine-ollama"

# Load environment variables from .env.local if present
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

MODEL_NAME="${OLLAMA_MODEL:-codellama:7b}"
MODEL_DIR="./infra/ollama/models"

info "Configured model: ${MODEL_NAME}"

# -----------------------------------------------------------------------------
# Ensure volume path exists (for model persistence)
# -----------------------------------------------------------------------------
if [ ! -d "${MODEL_DIR}" ]; then
  info "Creating local Ollama model directory..."
  mkdir -p "${MODEL_DIR}"
  sudo chown -R 1000:1000 infra/ollama
fi

# -----------------------------------------------------------------------------
# Check if the container is running
# -----------------------------------------------------------------------------
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  warning "Ollama container '${CONTAINER_NAME}' not running. Attempting to start..."
  docker compose up -d ollama >/dev/null 2>&1 || {
    error "Failed to start Ollama container."
    exit 1
  }
  sleep 3
fi

# -----------------------------------------------------------------------------
# Wait for Ollama API to be available
# -----------------------------------------------------------------------------
info "Waiting for Ollama API to respond..."
until curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; do
  sleep 2
done
success "Ollama API is up."

# -----------------------------------------------------------------------------
# Check if the model already exists (persisted)
# -----------------------------------------------------------------------------
if docker exec "${CONTAINER_NAME}" ollama list 2>/dev/null | grep -q "${MODEL_NAME}"; then
  success "Model '${MODEL_NAME}' already present — skipping download."
else
  info "Downloading model '${MODEL_NAME}' (first time only)..."
  docker exec -i "${CONTAINER_NAME}" ollama pull "${MODEL_NAME}" || {
    error "Failed to pull model '${MODEL_NAME}'."
    exit 1
  }
  success "Model '${MODEL_NAME}' successfully downloaded and persisted."
fi

# -----------------------------------------------------------------------------
# Verify model availability
# -----------------------------------------------------------------------------
if docker exec "${CONTAINER_NAME}" ollama list | grep -q "${MODEL_NAME}"; then
  success "Verified: '${MODEL_NAME}' available in Ollama."
else
  error "Model '${MODEL_NAME}' missing after setup!"
  exit 1
fi

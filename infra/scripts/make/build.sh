#!/bin/bash
set -euo pipefail

source infra/scripts/utils/messages.sh || { echo "messages.sh missing"; exit 1; }

info "Building all Context Machine service containers..."

# Call container-utils with build mode
./infra/scripts/utils/container-utils.sh build

success "✅ All service containers built successfully."
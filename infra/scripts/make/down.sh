#!/bin/bash
source infra/scripts/utils/messages.sh

info "Stopping services..."
docker compose down
system_down
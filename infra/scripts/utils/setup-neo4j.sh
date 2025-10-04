#!/bin/bash
set -euo pipefail
source infra/scripts/utils/messages.sh || { echo "messages.sh missing"; exit 1; }
source infra/scripts/utils/progress.sh || { echo "progress.sh missing"; exit 1; }

CONTAINER="context-machine-neo4j"
WAIT_SECS=30

info "Waiting for Neo4j (${WAIT_SECS}s)..."

if progress_bar "$WAIT_SECS" \
   "docker exec $CONTAINER cypher-shell -u neo4j -p test123 'RETURN 1;'"; then
  success "Neo4j is reachable."
else
  error "Neo4j not reachable within ${WAIT_SECS}s."
  docker logs "$CONTAINER" 2>/dev/null | tail -n 40 || true
  exit 1
fi

# Beispiel-Setup: leeres Test-Datenbank-Label erstellen
info "Creating test node in Neo4j..."
docker exec -i $CONTAINER cypher-shell -u neo4j -p test123 <<'CYPHER'
MERGE (n:Init {name:"Context-Machine"})
RETURN n;
CYPHER

success "Neo4j setup complete."

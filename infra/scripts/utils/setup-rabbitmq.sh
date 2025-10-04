#!/bin/bash
set -euo pipefail
source infra/scripts/utils/messages.sh || { echo "messages.sh missing"; exit 1; }
source infra/scripts/utils/progress.sh || { echo "progress.sh missing"; exit 1; }

info "Starting RabbitMQ setup..."

# Load env vars
if [ -f .env.local ]; then
  set -a
  . .env.local
  set +a
fi

# Required vars
: "${RABBITMQ_DEFAULT_USER:?RABBITMQ_DEFAULT_USER is required}"
: "${RABBITMQ_DEFAULT_PASS:?RABBITMQ_DEFAULT_PASS is required}"
: "${RABBITMQ_VHOST:?RABBITMQ_VHOST is required}"
: "${RABBITMQ_EXCHANGE:?RABBITMQ_EXCHANGE is required}"
: "${RABBITMQ_QUEUE:?RABBITMQ_QUEUE is required}"
: "${RABBITMQ_ROUTING_KEY:?RABBITMQ_ROUTING_KEY is required}"

CONTAINER="context-machine-rabbitmq"
WAIT_SECS=20

info "Waiting for RabbitMQ (${WAIT_SECS}s)"

if progress_bar "$WAIT_SECS" \
   "docker exec $CONTAINER rabbitmqctl status"; then
  info "RabbitMQ is reachable."
else
  error "RabbitMQ not reachable within ${WAIT_SECS}s."
  docker logs "$CONTAINER" 2>/dev/null | tail -n 40 || true
  exit 1
fi

# Ensure vhost exists
info "Ensuring vhost '${RABBITMQ_VHOST}' exists..."
docker exec "$CONTAINER" rabbitmqctl list_vhosts | grep -qw "$RABBITMQ_VHOST" \
  || docker exec "$CONTAINER" rabbitmqctl add_vhost "$RABBITMQ_VHOST"

# Ensure user exists
info "Ensuring user '${RABBITMQ_DEFAULT_USER}' exists..."
docker exec "$CONTAINER" rabbitmqctl list_users | grep -qw "$RABBITMQ_DEFAULT_USER" \
  || docker exec "$CONTAINER" rabbitmqctl add_user "$RABBITMQ_DEFAULT_USER" "$RABBITMQ_DEFAULT_PASS"

# Ensure user has admin tag and full permissions on vhost
docker exec "$CONTAINER" rabbitmqctl set_user_tags "$RABBITMQ_DEFAULT_USER" administrator
docker exec "$CONTAINER" rabbitmqctl set_permissions -p "$RABBITMQ_VHOST" "$RABBITMQ_DEFAULT_USER" ".*" ".*" ".*"

# Declare exchange
info "Declaring exchange '${RABBITMQ_EXCHANGE}'..."
docker exec "$CONTAINER" rabbitmqadmin \
  --vhost="$RABBITMQ_VHOST" \
  --username="$RABBITMQ_DEFAULT_USER" \
  --password="$RABBITMQ_DEFAULT_PASS" \
  declare exchange name="$RABBITMQ_EXCHANGE" type=direct durable=true

# Declare queue
info "Declaring queue '${RABBITMQ_QUEUE}'..."
docker exec "$CONTAINER" rabbitmqadmin \
  --vhost="$RABBITMQ_VHOST" \
  --username="$RABBITMQ_DEFAULT_USER" \
  --password="$RABBITMQ_DEFAULT_PASS" \
  declare queue name="$RABBITMQ_QUEUE" durable=true

# Declare binding
info "Binding queue '${RABBITMQ_QUEUE}' to exchange '${RABBITMQ_EXCHANGE}' with key '${RABBITMQ_ROUTING_KEY}'..."
docker exec "$CONTAINER" rabbitmqadmin \
  --vhost="$RABBITMQ_VHOST" \
  --username="$RABBITMQ_DEFAULT_USER" \
  --password="$RABBITMQ_DEFAULT_PASS" \
  declare binding source="$RABBITMQ_EXCHANGE" destination="$RABBITMQ_QUEUE" routing_key="$RABBITMQ_ROUTING_KEY"

# Verify results
info "Verifying resources..."
docker exec "$CONTAINER" rabbitmqadmin \
  --vhost="$RABBITMQ_VHOST" \
  --username="$RABBITMQ_DEFAULT_USER" \
  --password="$RABBITMQ_DEFAULT_PASS" \
  list exchanges name | grep -w "$RABBITMQ_EXCHANGE" || error "Exchange missing"

docker exec "$CONTAINER" rabbitmqadmin \
  --vhost="$RABBITMQ_VHOST" \
  --username="$RABBITMQ_DEFAULT_USER" \
  --password="$RABBITMQ_DEFAULT_PASS" \
  list queues name | grep -w "$RABBITMQ_QUEUE" || error "Queue missing"

success "RabbitMQ setup complete."

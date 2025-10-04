#!/bin/bash
set -euo pipefail
source infra/scripts/utils/messages.sh

CONTAINER="context-machine-n8n"
DB_FILE="./infra/n8n/data/database.sqlite"

# --- load env ---
if [ -f .env.local ]; then
  set -a
  . .env.local
  set +a
else
  error ".env.local not found!"
  exit 1
fi

# --- required vars ---
: "${N8N_BOOTSTRAP_EMAIL:?Missing N8N_BOOTSTRAP_EMAIL in .env.local}"
: "${N8N_BOOTSTRAP_FIRSTNAME:?Missing N8N_BOOTSTRAP_FIRSTNAME in .env.local}"
: "${N8N_BOOTSTRAP_LASTNAME:?Missing N8N_BOOTSTRAP_LASTNAME in .env.local}"
: "${N8N_BOOTSTRAP_PASSWORD:?Missing N8N_BOOTSTRAP_PASSWORD in .env.local}"
: "${N8N_BOOTSTRAP_ROLE:=global:owner}"

: "${RABBITMQ_DEFAULT_USER:?Missing RABBITMQ_DEFAULT_USER in .env.local}"
: "${RABBITMQ_DEFAULT_PASS:?Missing RABBITMQ_DEFAULT_PASS in .env.local}"
: "${RABBITMQ_VHOST:?Missing RABBITMQ_VHOST in .env.local}"


EMAIL="$N8N_BOOTSTRAP_EMAIL"
FIRSTNAME="$N8N_BOOTSTRAP_FIRSTNAME"
LASTNAME="$N8N_BOOTSTRAP_LASTNAME"
PASSWORD="$N8N_BOOTSTRAP_PASSWORD"
ROLE="$N8N_BOOTSTRAP_ROLE"
N8N_HTTP_PORT="${N8N_PORT:-5678}"

# --- bcrypt hash ---
HASH=$(python3 - <<EOF
import bcrypt
print(bcrypt.hashpw(b"$PASSWORD", bcrypt.gensalt()).decode())
EOF
)

NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
N8N_VERSION=$(docker exec "$CONTAINER" n8n --version 2>/dev/null || echo "1.0.0")

PERSONALIZATION="{\"version\":\"v4\",\"personalization_survey_submitted_at\":\"$NOW\",\"personalization_survey_n8n_version\":\"$N8N_VERSION\"}"
SETTINGS="{\"userActivated\":false}"

# --- wait for sqlite file ---
info "Waiting for n8n DB file..."
for i in $(seq 1 30); do
  if [ -f "$DB_FILE" ]; then
    success "DB file found: $DB_FILE"
    break
  fi
  sleep 2
done
[ -f "$DB_FILE" ] || { error "Database file not found after 60s: $DB_FILE"; exit 1; }

# --- bootstrap owner user if password empty ---
USER_ID=$(sqlite3 "$DB_FILE" "SELECT id FROM user LIMIT 1;")
USER_PASS=$(sqlite3 "$DB_FILE" "SELECT password FROM user WHERE id='$USER_ID';")

if [ -z "${USER_ID:-}" ]; then
  error "No user shell found in DB (table 'user' is empty). Start n8n once so it seeds the owner shell."
  exit 1
fi

if [ -z "$USER_PASS" ]; then
  info "Updating bootstrap user ($USER_ID) and activating instance..."
  sqlite3 "$DB_FILE" <<SQL
UPDATE user
SET email='$EMAIL',
    firstName='$FIRSTNAME',
    lastName='$LASTNAME',
    password='$HASH',
    role='$ROLE',
    personalizationAnswers='$PERSONALIZATION',
    settings='$SETTINGS',
    updatedAt=datetime('now')
WHERE id='$USER_ID';
SQL

  sqlite3 "$DB_FILE" <<SQL
INSERT OR REPLACE INTO settings (key, value, loadOnStartup)
VALUES ('userManagement.isInstanceOwnerSetUp', 'true', 1);
SQL

  success "Owner user updated; instance marked as set up."
else
  warning "User $USER_ID already has a password. Skipping owner bootstrap."
fi

# --- restart n8n so it reads the settings flag ---
info "Restarting n8n container..."
docker restart "$CONTAINER" >/dev/null || true

# --- wait until n8n is up before importing credentials ---
info "Waiting for n8n HTTP (${N8N_HTTP_PORT})..."
for i in $(seq 1 60); do
  if curl -fsS "http://localhost:${N8N_HTTP_PORT}/" >/dev/null 2>&1; then
    success "n8n is responding."
    break
  fi
  sleep 1
done

# --- purge existing creds before re-import ---
info "Purging old credentials..."
docker exec "$CONTAINER" n8n export:credentials --all --output=/home/node/all-creds.json >/dev/null 2>&1 || true
docker exec "$CONTAINER" n8n delete:credentials --all >/dev/null 2>&1 || true

# --- import RabbitMQ credentials ---
info "Importing RabbitMQ credentials into n8n..."
CREDS_JSON=$(cat <<EOF
[
  {
    "id": "rabbit-default",
    "name": "RabbitMQ Default",
    "type": "rabbitmq",
    "nodesAccess": [],
    "data": {
      "hostname": "context-machine-rabbitmq",
      "port": 5672,
      "username": "$RABBITMQ_DEFAULT_USER",
      "password": "$RABBITMQ_DEFAULT_PASS",
      "vhost": "$RABBITMQ_VHOST",
      "ssl": false
    }
  }
]
EOF
)

TMP_JSON="$(mktemp)"
echo "$CREDS_JSON" > "$TMP_JSON"
docker cp "$TMP_JSON" "$CONTAINER:/home/node/rabbit-creds.json"
rm -f "$TMP_JSON"

if docker exec "$CONTAINER" n8n import:credentials --input=/home/node/rabbit-creds.json; then
  success "RabbitMQ credentials imported."
else
  warning "Credential import for RabbitMQ reported an error."
fi


success "n8n ready with owner '$EMAIL', RabbitMQ and MinIO credentials."

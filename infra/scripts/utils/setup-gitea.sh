#!/bin/bash
set -euo pipefail

# -----------------------------------------------------------------------------
# Gitea setup script for Context Machine
# Ensures Gitea is healthy, admin user exists, and API token is generated.
# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# Load logging helpers
# -----------------------------------------------------------------------------
if [ ! -f infra/scripts/utils/messages.sh ]; then
  echo "ERROR: messages.sh missing — aborting setup."
  exit 1
fi
source infra/scripts/utils/messages.sh

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
GITEA_URL="http://0.0.0.0:${GITEA_HTTP_PORT:-3005}"
ADMIN_USER="${GITEA_ADMIN_USER:-admin}"
ADMIN_PASS="${GITEA_ADMIN_PASSWORD:-admin123}"
ADMIN_MAIL="${GITEA_ADMIN_EMAIL:-admin@example.com}"
TOKEN_FILE="${GITEA_TOKEN_FILE:-./infra/gitea/admin_token.txt}"
CONTAINER_NAME="context-machine-gitea"
GITEA_USER="1000:1000"            # 'git' user inside the container
ADMIN_USER_FALLBACK="${ADMIN_USER_FALLBACK:-gitea-admin}"
TOKEN_NAME="context-machine-auto-$(date +%s)"  # unique to avoid name collisions

exec_gitea() {
  docker exec -u "${GITEA_USER}" "${CONTAINER_NAME}" "$@"
}

# -----------------------------------------------------------------------------
# Wait for Gitea to be healthy
# -----------------------------------------------------------------------------
info "Waiting for Gitea to become available on ${GITEA_URL} ..."
until curl -sf "${GITEA_URL}/api/healthz" >/dev/null 2>&1; do
  sleep 3
done
success "Gitea is responding on ${GITEA_URL}"

# -----------------------------------------------------------------------------
# Ensure admin user exists (handles reserved/fallback correctly)
# -----------------------------------------------------------------------------
EFFECTIVE_USER="${ADMIN_USER}"

info "Ensuring admin user '${EFFECTIVE_USER}' exists..."

# Check if either primary or fallback already exists
if exec_gitea gitea admin user list 2>/dev/null | awk 'NR>1{print $2}' | grep -Fxq "${EFFECTIVE_USER}"; then
  success "Admin user '${EFFECTIVE_USER}' already exists."
elif exec_gitea gitea admin user list 2>/dev/null | awk 'NR>1{print $2}' | grep -Fxq "${ADMIN_USER_FALLBACK}"; then
  EFFECTIVE_USER="${ADMIN_USER_FALLBACK}"
  success "Fallback admin user '${EFFECTIVE_USER}' already exists."
else
  info "Creating admin user '${EFFECTIVE_USER}'..."
  set +e
  CREATE_OUT="$(exec_gitea gitea admin user create \
      --username "${EFFECTIVE_USER}" \
      --password "${ADMIN_PASS}" \
      --email "${ADMIN_MAIL}" \
      --admin 2>&1)"
  CREATE_RC=$?
  set -e

  if [ $CREATE_RC -ne 0 ]; then
    if echo "${CREATE_OUT}" | grep -qi "name is reserved"; then
      warning "Username '${EFFECTIVE_USER}' is reserved. Falling back to '${ADMIN_USER_FALLBACK}'."
      EFFECTIVE_USER="${ADMIN_USER_FALLBACK}"
      # Create fallback only if it doesn't exist
      if exec_gitea gitea admin user list 2>/dev/null | awk 'NR>1{print $2}' | grep -Fxq "${EFFECTIVE_USER}"; then
        success "Fallback admin user '${EFFECTIVE_USER}' already exists."
      else
        info "Creating fallback admin user '${EFFECTIVE_USER}'..."
        exec_gitea gitea admin user create \
          --username "${EFFECTIVE_USER}" \
          --password "${ADMIN_PASS}" \
          --email "${ADMIN_MAIL}" \
          --admin
        success "Fallback admin user '${EFFECTIVE_USER}' created."
      fi
    elif echo "${CREATE_OUT}" | grep -qi "already exists"; then
      success "Admin user '${EFFECTIVE_USER}' already exists."
    else
      error "User creation failed: ${CREATE_OUT}"
      exit 1
    fi
  else
    success "Admin user '${EFFECTIVE_USER}' created."
  fi
fi

# -----------------------------------------------------------------------------
# Generate API token (unique name to avoid collisions)
# -----------------------------------------------------------------------------
info "Generating API token for ${EFFECTIVE_USER} ..."
set +e
TOKEN="$(exec_gitea gitea admin user generate-access-token \
  --username "${EFFECTIVE_USER}" \
  --token-name "${TOKEN_NAME}" 2>/dev/null | tail -n1 | tr -d '\r')"
RC=$?
set -e

if [[ $RC -ne 0 || -z "${TOKEN}" ]]; then
  error "Failed to generate API token for user '${EFFECTIVE_USER}'."
  exit 1
fi

# -----------------------------------------------------------------------------
# Persist token to file
# -----------------------------------------------------------------------------
mkdir -p "$(dirname "${TOKEN_FILE}")"
echo "${TOKEN}" > "${TOKEN_FILE}"
chmod 600 "${TOKEN_FILE}"

success "Gitea admin user: ${EFFECTIVE_USER}"
success "Token saved to ${TOKEN_FILE}"

#!/bin/bash
set -euo pipefail

# Colors
RESET='\033[0m'
BOLD='\033[1m'
GREEN='\033[38;5;82m'
BLUE='\033[38;5;39m'
YELLOW='\033[38;5;220m'
CYAN='\033[36m'

echo ""
echo -e "${BOLD}${CYAN}============================================================${RESET}"
echo -e "${BOLD}   🚀 Context-Machine is up and running${RESET}"
echo -e "${BOLD}${CYAN}============================================================${RESET}"
echo ""

# MinIO
echo -e "${BOLD}${YELLOW}MinIO (Object Storage):${RESET}"
echo -e "  URL:   ${BLUE}http://localhost:9001${RESET}"
echo -e "  User:  ${GREEN}${MINIO_ROOT_USER:-minioadmin}${RESET}"
echo -e "  Pass:  ${GREEN}${MINIO_ROOT_PASSWORD:-minioadmin}${RESET}"
echo ""

# RabbitMQ
echo -e "${BOLD}${YELLOW}RabbitMQ (Message Broker):${RESET}"
echo -e "  URL:   ${BLUE}http://localhost:15672${RESET}"
echo -e "  User:  ${GREEN}${RABBITMQ_DEFAULT_USER:-guest}${RESET}"
echo -e "  Pass:  ${GREEN}${RABBITMQ_DEFAULT_PASS:-guest}${RESET}"
echo -e "  VHost: ${GREEN}${RABBITMQ_VHOST:-/}${RESET}"
echo ""

# Neo4j
echo -e "${BOLD}${YELLOW}Neo4j (Graph Database):${RESET}"
echo -e "  URL:   ${BLUE}http://localhost:7474${RESET}"
echo -e "  Bolt:  ${BLUE}bolt://localhost:7687${RESET}"
echo -e "  User:  ${GREEN}${NEO4J_USER:-neo4j}${RESET}"
echo -e "  Pass:  ${GREEN}${NEO4J_PASSWORD:-test123}${RESET}"
echo ""

# n8n
echo -e "${BOLD}${YELLOW}n8n (Workflow Automation):${RESET}"
echo -e "  URL:   ${BLUE}http://localhost:${N8N_PORT:-5678}${RESET}"
if [ "${N8N_BASIC_AUTH_ACTIVE:-false}" = "true" ]; then
  echo -e "  User:  ${GREEN}${N8N_BASIC_AUTH_USER:-admin}${RESET}"
  echo -e "  Pass:  ${GREEN}${N8N_BASIC_AUTH_PASSWORD:-admin123}${RESET}"
fi
echo ""

echo -e "${BOLD}${CYAN}============================================================${RESET}"
echo -e "${BOLD}   Next steps:${RESET}"
echo -e "    1. Login to the services above with provided credentials"
echo -e "    2. Start using MinIO for file storage"
echo -e "    3. Send/consume messages via RabbitMQ"
echo -e "    4. Explore your graph with Neo4j"
echo -e "    5. Build workflows with n8n"
echo -e "${BOLD}${CYAN}============================================================${RESET}"
echo ""

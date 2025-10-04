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
echo -e "${BOLD}   🚀 Context Machine is up and running${RESET}"
echo -e "${BOLD}${CYAN}============================================================${RESET}"
echo ""

# MinIO
echo -e "${BOLD}${YELLOW}MinIO (Object Storage):${RESET}"
echo -e "  URL:   ${BLUE}http://localhost:9001${RESET}"
echo -e "  User:  ${GREEN}${MINIO_ROOT_USER:-minioadmin}${RESET}"
echo -e "  Pass:  ${GREEN}${MINIO_ROOT_PASSWORD:-minioadmin}${RESET}"
echo -e "  Bucket:${GREEN}${MINIO_BUCKET:-incoming}${RESET}"
echo ""

# RabbitMQ
echo -e "${BOLD}${YELLOW}RabbitMQ (Message Broker):${RESET}"
echo -e "  URL:   ${BLUE}http://localhost:15672${RESET}"
echo -e "  User:  ${GREEN}${RABBITMQ_DEFAULT_USER:-guest}${RESET}"
echo -e "  Pass:  ${GREEN}${RABBITMQ_DEFAULT_PASS:-guest}${RESET}"
echo -e "  VHost: ${GREEN}${RABBITMQ_VHOST:-/}${RESET}"
echo -e "  Exchange: ${GREEN}${RABBITMQ_EXCHANGE:-file-events}${RESET}"
echo -e "  Queue:    ${GREEN}${RABBITMQ_QUEUE:-file-processing}${RESET}"
echo -e "  Routing:  ${GREEN}${RABBITMQ_ROUTING_KEY:-file.put}${RESET}"
echo ""

# Neo4j
echo -e "${BOLD}${YELLOW}Neo4j (Graph Database):${RESET}"
echo -e "  Browser: ${BLUE}http://localhost:7474${RESET}"
echo -e "  Bolt:    ${BLUE}bolt://localhost:7687${RESET}"
echo -e "  User:    ${GREEN}${NEO4J_USER:-neo4j}${RESET}"
echo -e "  Pass:    ${GREEN}${NEO4J_PASSWORD:-test12345}${RESET}"
echo -e "  DB:      ${GREEN}${NEO4J_DATABASE:-neo4j}${RESET}"
echo ""

# n8n
echo -e "${BOLD}${YELLOW}n8n (Workflow Automation):${RESET}"
echo -e "  URL:   ${BLUE}http://localhost:${N8N_PORT:-5678}${RESET}"
if [ "${N8N_BASIC_AUTH_ACTIVE:-false}" = "true" ]; then
  echo -e "  User:  ${GREEN}${N8N_BASIC_AUTH_USER:-admin}${RESET}"
  echo -e "  Pass:  ${GREEN}${N8N_BASIC_AUTH_PASSWORD:-admin123}${RESET}"
fi
echo ""

# Neo4j Service
echo -e "${BOLD}${YELLOW}Neo4j Service (Flask API):${RESET}"
echo -e "  URL:          ${BLUE}http://localhost:3001${RESET}"
echo -e "  Swagger UI:   ${BLUE}http://localhost:3001/apidocs${RESET}"
echo -e "  OpenAPI JSON: ${BLUE}http://localhost:3001/api/openapi.json${RESET}"
echo -e "  API Key:      ${GREEN}${API_KEY:-dev-key-123}${RESET}"
echo ""

# Analyzer Service
echo -e "${BOLD}${YELLOW}Analyzer Service:${RESET}"
echo -e "  URL:          ${BLUE}http://localhost:3002${RESET}"
echo -e "  Swagger UI:   ${BLUE}http://localhost:3002/apidocs${RESET}"
echo -e "  OpenAPI JSON: ${BLUE}http://localhost:3002/api/openapi.json${RESET}"
echo -e "  API Key:      ${GREEN}${API_KEY:-dev-key-123}${RESET}"
echo ""

echo -e "${BOLD}${CYAN}============================================================${RESET}"
echo -e "${BOLD}   Next steps:${RESET}"
echo -e "    1. Login to the services above using the shown credentials"
echo -e "    2. Upload and manage files in MinIO"
echo -e "    3. Inspect events in RabbitMQ"
echo -e "    4. Explore your graph via Neo4j Browser"
echo -e "    5. Test API endpoints via Swagger UI"
echo -e "    6. Automate workflows in n8n"
echo -e "    7. Analyze code with the Analyzer Service"
echo -e "${BOLD}${CYAN}============================================================${RESET}"
echo ""

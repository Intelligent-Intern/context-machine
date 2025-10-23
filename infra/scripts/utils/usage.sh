#!/bin/bash
set -euo pipefail

# -----------------------------------------------------------------------------
# Context Machine – Usage Summary
# -----------------------------------------------------------------------------

# Load environment variables if available
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

# Colors
RESET='\033[0m'
BOLD='\033[1m'
GREEN='\033[38;5;82m'
BLUE='\033[38;5;39m'
YELLOW='\033[38;5;220m'
CYAN='\033[36m'


context_logo() {
echo ""
cat <<'EOF'
                                     /$$                           /$$    
                                    | $$                          | $$    
      /$$$$$$$  /$$$$$$  /$$$$$$$  /$$$$$$    /$$$$$$  /$$   /$$ /$$$$$$  
     /$$_____/ /$$__  $$| $$__  $$|_  $$_/   /$$__  $$|  $$ /$$/|_  $$_/  
    | $$      | $$  \ $$| $$  \ $$  | $$    | $$$$$$$$ \  $$$$/   | $$    
    | $$      | $$  | $$| $$  | $$  | $$ /$$| $$_____/  >$$  $$   | $$ /$$
    |  $$$$$$$|  $$$$$$/| $$  | $$  |  $$$$/|  $$$$$$$ /$$/\  $$  |  $$$$/
     \_______/ \______/ |__/  |__/   \___/   \_______/|__/  \__/   \___/  
                                                                          
                                                                          
                                       /$$       /$$                    
                                      | $$      |__/                    
     /$$$$$$/$$$$   /$$$$$$   /$$$$$$$| $$$$$$$  /$$ /$$$$$$$   /$$$$$$ 
    | $$_  $$_  $$ |____  $$ /$$_____/| $$__  $$| $$| $$__  $$ /$$__  $$
    | $$ \ $$ \ $$  /$$$$$$$| $$      | $$  \ $$| $$| $$  \ $$| $$$$$$$$
    | $$ | $$ | $$ /$$__  $$| $$      | $$  | $$| $$| $$  | $$| $$_____/
    | $$ | $$ | $$|  $$$$$$$|  $$$$$$$| $$  | $$| $$| $$  | $$|  $$$$$$$
    |__/ |__/ |__/ \_______/ \_______/|__/  |__/|__/|__/  |__/ \_______/
                                                                        
                                                                        
EOF
echo ""
}



context_logo

  echo " "
  echo -e "${BOLD}${CYAN}============================================================${RESET}"
  echo -e "${BOLD}   🚀 Context Machine is up and running${RESET}"
  echo -e "${BOLD}${CYAN}============================================================${RESET}"
  echo ""

  # MinIO
  echo -e "${BOLD}${YELLOW}MinIO (Object Storage):${RESET}"
  echo -e "  URL:     ${BLUE}http://localhost:9001${RESET}"
  echo -e "  User:    ${GREEN}${MINIO_ROOT_USER:-minioadmin}${RESET}"
  echo -e "  Pass:    ${GREEN}${MINIO_ROOT_PASSWORD:-minioadmin}${RESET}"
  echo -e "  Bucket:  ${GREEN}${MINIO_BUCKET:-incoming}${RESET}"
  echo ""

  # RabbitMQ
  echo -e "${BOLD}${YELLOW}RabbitMQ (Message Broker):${RESET}"
  echo -e "  URL:     ${BLUE}http://localhost:15672${RESET}"
  echo -e "  User:    ${GREEN}${RABBITMQ_DEFAULT_USER:-guest}${RESET}"
  echo -e "  Pass:    ${GREEN}${RABBITMQ_DEFAULT_PASS:-guest}${RESET}"
  echo -e "  VHost:   ${GREEN}${RABBITMQ_VHOST:-/}${RESET}"
  echo -e "  Exchange:${GREEN}${RABBITMQ_EXCHANGE:-file-events}${RESET}"
  echo -e "  Queue:   ${GREEN}${RABBITMQ_QUEUE:-file-processing}${RESET}"
  echo -e "  Routing: ${GREEN}${RABBITMQ_ROUTING_KEY:-file.put}${RESET}"
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
  echo -e "  URL:     ${BLUE}http://localhost:${N8N_PORT:-5678}${RESET}"
  if [ "${N8N_BASIC_AUTH_ACTIVE:-false}" = "true" ]; then
    echo -e "  User:    ${GREEN}${N8N_BASIC_AUTH_USER:-admin}${RESET}"
    echo -e "  Pass:    ${GREEN}${N8N_BASIC_AUTH_PASSWORD:-admin123}${RESET}"
  fi
  echo ""

  # Gitea
  echo -e "${BOLD}${YELLOW}Gitea (Git Service):${RESET}"
  echo -e "  URL:     ${BLUE}http://localhost:3005${RESET}"
  echo -e "  SSH:     ${BLUE}ssh://git@localhost:3022${RESET}"
  echo -e "  User:    ${GREEN}${GITEA_ADMIN_USER:-gitea-admin}${RESET}"
  echo -e "  Pass:    ${GREEN}${GITEA_ADMIN_PASSWORD:-admin123}${RESET}"
  if [ -f "./infra/gitea/admin_token.txt" ]; then
    echo -e "  Token:   ${GREEN}$(cat ./infra/gitea/admin_token.txt)${RESET}"
  else
    echo -e "  Token:   ${YELLOW}<not yet generated>${RESET}"
  fi
  echo ""

  # Ollama + OpenWebUI
  echo -e "${BOLD}${YELLOW}Ollama (Local LLM Runtime):${RESET}"
  echo -e "  API:     ${BLUE}http://localhost:11434${RESET}"
  echo -e "  Model:   ${GREEN}${OLLAMA_MODEL:-codellama:7b}${RESET}"

  # Quick model check
  if docker ps --format '{{.Names}}' | grep -q "context-machine-ollama"; then
    if docker exec context-machine-ollama ollama list 2>/dev/null | grep -q "${OLLAMA_MODEL:-codellama:7b}"; then
      echo -e "  Status:  ${GREEN}✔ Model loaded and ready${RESET}"
    else
      echo -e "  Status:  ${YELLOW}↻ Model not yet pulled${RESET}"
    fi
  else
    echo -e "  Status:  ${YELLOW}⚠ Ollama container not running${RESET}"
  fi
  echo ""

  echo -e "${BOLD}${YELLOW}OpenWebUI (Chat Interface):${RESET}"
  echo -e "  URL:     ${BLUE}http://localhost:8080${RESET}"
  echo -e "  Backend: ${GREEN}Connected to Ollama on port 11434${RESET}"
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

  # Backend Service
  echo -e "${BOLD}${YELLOW}Backend Service (API Gateway):${RESET}"
  echo -e "  URL:          ${BLUE}http://localhost:3006${RESET}"
  echo -e "  Swagger UI:   ${BLUE}http://localhost:3006/apidocs${RESET}"
  echo -e "  OpenAPI JSON: ${BLUE}http://localhost:3006/openapi.json${RESET}"
  echo -e "  Health:       ${BLUE}http://localhost:3006/api/health${RESET}"
  echo -e "  Login:        ${CYAN}POST /api/auth/login${RESET}"
  echo -e "  Register:     ${CYAN}POST /api/auth/register${RESET}"
  echo -e "  Messages:     ${CYAN}POST /api/message${RESET}"
  echo ""

  # Frontend Service
  echo -e "${BOLD}${YELLOW}Frontend (Vue 3 SPA):${RESET}"
  echo -e "  URL:          ${BLUE}http://localhost:5173${RESET}"
  echo -e "  Login:        ${BLUE}http://localhost:5173/login${RESET}"
  echo -e "  Credentials:  ${GREEN}admin / admin123${RESET}"
  echo ""

  echo -e "${BOLD}${CYAN}============================================================${RESET}"
  echo -e "${BOLD}   🎯 MAIN APPLICATION:${RESET}"
  echo -e "    ${BOLD}${GREEN}Frontend (Context Machine UI): ${BLUE}http://localhost:5173${RESET}"
  echo -e "    ${BOLD}${GREEN}Login with: admin / admin123${RESET}"
  echo ""
  echo -e "${BOLD}   Next steps:${RESET}"
  echo -e "    1. Open the Context Machine Frontend at http://localhost:5173"
  echo -e "    2. Login with admin/admin123 to access the dynamic UI"
  echo -e "    3. Upload and manage files in MinIO"
  echo -e "    4. Inspect events in RabbitMQ"
  echo -e "    5. Explore your graph via Neo4j Browser"
  echo -e "    6. Test API endpoints via Swagger UI"
  echo -e "    7. Automate workflows in n8n"
  echo -e "    8. Manage repos and tokens in Gitea"
  echo -e "    9. Chat with ${OLLAMA_MODEL:-codellama:7b} via OpenWebUI"
  echo -e "   10. Analyze code with the Analyzer Service"
  echo -e "${BOLD}${CYAN}============================================================${RESET}"
  echo ""

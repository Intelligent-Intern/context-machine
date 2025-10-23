# 🧠 Context Machine – Dynamic Data-Driven Platform

**Context Machine** is a revolutionary **dynamic, data-driven platform** where the entire user interface configures itself from backend data. Unlike traditional applications with hardcoded routes and components, Context Machine builds everything at runtime from database configurations.

## 🎯 Core Concept

**No Hardcoded Frontend** – Pages, navigation, widgets, and layouts are all generated dynamically from backend data. The system uses a sophisticated **multi-tenant architecture** with subscription-based access control and a **message-driven communication protocol**.

### Key Architecture Components

- **Vue 3 Frontend** – Completely dynamic UI that builds itself from JSON manifests
- **Flask API Gateway** – JWT authentication with unified message routing to specialized services  
- **Widget-Based UI** – Modular, themeable components loaded at runtime
- **Multi-Tenant Database** – SuperAdmin → Partner → Tenant → Project hierarchy
- **Real-Time Updates** – WebSocket-based live synchronization
- **Message Protocol** – Unified communication format across all services
- **Code Analysis Engine** – Multi-language AST parsing with graph visualization

### What Makes It Special

🔄 **Runtime Configuration** – Everything from routes to UI components is loaded from the database  
🎨 **Dynamic Theming** – CSS variables and themes applied at runtime  
📦 **Widget Ecosystem** – Modular components with manifest-based loading  
🏢 **Multi-Tenant Ready** – Built-in subscription and permission management  
⚡ **Real-Time Sync** – Live updates across all connected clients  
🔐 **JWT Security** – Secure, stateless authentication with role-based access  
🔍 **Code Intelligence** – AST-based code analysis with graph database storage

## 🏗️ System Architecture

The platform consists of **core services** that power the dynamic system, plus **additional tools** for enhanced functionality:

### Core Platform Services
- **Backend Service** (Port 3006) – Main API Gateway with JWT auth and message routing
- **Frontend Service** (Port 5173/8080) – Vue 3 SPA with dynamic UI generation  
- **WebSocket Service** (Port 3010) – Real-time event distribution
- **PostgreSQL** – Multi-tenant database with complete schema

### Code Analysis & Intelligence Services
- **Analyzer Service** (Port 3002) – Multi-language source code analyzer with AST parsing and recursive tree analysis
- **Neo4j Service** (Port 3001) – Graph database for storing code relationships and structures
- **22 Domain-Specific Analyzers** – Agricultural, Business, Coding, Communication, Cultural, Digital, Educational, Energy, Environmental, Financial, Legal, Manufacturing, Maritime, Medical, Quality, Scientific, Security, Social, Spatial, Technical, Temporal, Transportation
- **MCP Service** (Port 3003) – Model Context Protocol integration for AI-powered analysis

### Additional Tools (Bonus Features)
- **Ollama + OpenWebUI** – Local LLM runtime for AI-powered features
- **n8n** – Workflow automation engine  
- **Gitea** – Local Git hosting and repository management
- **MinIO** – S3-compatible object storage
- **RabbitMQ** – Message broker for event routing

---

## 🚀 Quick Start

### 1. Create `.env.local`

Example configuration:

~~~bash
# API Authentication
API_KEY=dev-key-123 

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_BUCKET=incoming

# RabbitMQ
RABBITMQ_DEFAULT_USER=admin
RABBITMQ_DEFAULT_PASS=admin123
RABBITMQ_VHOST=/
RABBITMQ_EXCHANGE=file-events
RABBITMQ_QUEUE=file-processing
RABBITMQ_ROUTING_KEY=file.put

# n8n
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=admin123
N8N_ENCRYPTION_KEY=supersecretkey123
N8N_PORT=5678
N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false
N8N_RUNNERS_ENABLED=true
N8N_BOOTSTRAP_EMAIL=foo@example.com
N8N_BOOTSTRAP_FIRSTNAME=bar
N8N_BOOTSTRAP_LASTNAME=foo
N8N_BOOTSTRAP_PASSWORD=A1234567
N8N_BOOTSTRAP_ROLE=global:owner

# Neo4j
NEO4J_AUTH=neo4j/test12345
DB_SQLITE_POOL_SIZE=2

# Analyzer ↔ Neo4j connection
SERVICE_NEO4J_URI=bolt://context-machine-neo4j:7687
SERVICE_NEO4J_AUTH=neo4j/test12345

# WebSocket Service
WS_HOST=0.0.0.0
WS_PORT=3010

# Gitea (Git service)
GITEA_HTTP_PORT=3005
GITEA_ADMIN_USER=gitea-admin
GITEA_ADMIN_PASSWORD=admin123
GITEA_ADMIN_EMAIL=admin@example.com

# Ollama + OpenWebUI
OLLAMA_MODEL=codellama:7b
OPENWEBUI_PORT=8080
~~~

---

### 2. Start the infrastructure

~~~bash
make up
~~~

This will:
- Build all service containers  
- Initialize MinIO, RabbitMQ, n8n, Neo4j, Gitea, Ollama, and OpenWebUI  
- Automatically create users, queues, buckets, and tokens  
- Pull and persist the configured Ollama model (`OLLAMA_MODEL`)  

When setup completes, you’ll see a summary like:

~~~
🚀 Context Machine is up and running
~~~

---

### 3. Analyze Your Code

**Create a project folder and add your source code:**
~~~bash
mkdir project
# Copy your source code into the project folder
~~~

**Start the code analysis:**
~~~bash
curl -X POST http://localhost:3002/api/analyze \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-key-123"
~~~

The analyzer will:
- **Recursively scan** your project directory for all supported file types
- **Parse AST** (Abstract Syntax Trees) for each source file
- **Create graph nodes** in Neo4j representing files, folders, and code structures
- **Stream real-time progress** via WebSocket (1% increments)
- **Generate visualizations** of your codebase structure

**Supported Languages:**
JavaScript, TypeScript, Python, Java, C/C++, Go, Rust, PHP, Ruby, and more

**Real-time Progress Updates:**
~~~json
{"percent": 1}   // Starting analysis
{"percent": 50}  // Halfway through
{"percent": 100} // Analysis complete
~~~

**Query Your Code Graph:**
~~~cypher
// Find all Python files
MATCH (f:File) WHERE f.extension = '.py' RETURN f

// Analyze project structure  
MATCH (folder:Folder)-[:CONTAINS]->(file:File) 
RETURN folder.name, count(file) as file_count
~~~

![AST Graph Example](code_graph.png)

*Everything runs locally – no code leaves your machine.*

## 🔍 Code Analysis Integration

The code analysis system seamlessly integrates with the dynamic platform:

**Dynamic Widgets for Code Visualization:**
- Code structure widgets automatically appear in the frontend
- Interactive graph visualizations load as dynamic components
- Real-time analysis progress shown via WebSocket updates

**Multi-Tenant Code Projects:**
- Each tenant can have multiple code analysis projects
- Permission-based access to different codebases
- Subscription-based limits on analysis scope

**AI-Powered Insights:**
- Local LLM integration via Ollama for code understanding
- Context-aware code suggestions and documentation
- Privacy-first approach - all AI runs locally

---

### 4. Access All Services

**Core Platform:**
| Service | URL | Credentials |
|----------|-----|-------------|
| **Frontend** | [http://localhost:5173](http://localhost:5173) (Dev) / [http://localhost:8080](http://localhost:8080) (Prod) | `admin / admin123` |
| **Backend API** | [http://localhost:3006/apidocs](http://localhost:3006/apidocs) | JWT Token |
| **WebSocket** | `ws://localhost:3010` | JWT Token |

**Code Analysis:**
| Service | URL | Credentials |
|----------|-----|-------------|
| **Analyzer Service API** | [http://localhost:3002/apidocs](http://localhost:3002/apidocs) | Header: `X-API-Key: dev-key-123` |
| **Neo4j Browser** | [http://localhost:7474](http://localhost:7474) | `neo4j / test12345` |
| **Neo4j Service API** | [http://localhost:3001/apidocs](http://localhost:3001/apidocs) | Header: `X-API-Key: dev-key-123` |
| **WebSocket Progress** | `ws://localhost:3010/progress?api_key=dev-key-123` | — |

**Additional Tools:**
| Service | URL | Credentials |
|----------|-----|-------------|
| **Ollama** | [http://localhost:11434](http://localhost:11434) | Model: `codellama:7b` |
| **OpenWebUI** | [http://localhost:8080](http://localhost:8080) | Chat with your local model |
| **n8n** | [http://localhost:5678](http://localhost:5678) | `admin / admin123` |
| **Gitea** | [http://localhost:3005](http://localhost:3005) | `gitea-admin / admin123` |
| **MinIO** | [http://localhost:9001](http://localhost:9001) | `minioadmin / minioadmin` |
| **RabbitMQ** | [http://localhost:15672](http://localhost:15672) | `admin / admin123` |

The Gitea API token (used for integrations) is saved at:
~~~
infra/gitea/admin_token.txt
~~~

---

### 5. Stop or Reset

Stop all services:
~~~bash
make down
~~~

Reset everything (delete all volumes & data):
~~~bash
make reset
~~~

---

## 🧩 Scripts

| Script | Purpose |
|--------|----------|
| `setup-minio.sh` | Creates MinIO buckets if missing |
| `setup-rabbitmq.sh` | Sets up vhost, users, exchanges, queues, bindings |
| `setup-minio-event.sh` | Configures AMQP notifications for MinIO |
| `setup-n8n.sh` | Bootstraps n8n and imports credentials |
| `setup-gitea.sh` | Ensures Gitea admin exists & generates API token |
| `setup-ollama.sh` | Starts Ollama container, pulls & persists model |
| `container-utils.sh` | Builds custom service containers |
| `messages.sh` | Colorized logging utilities |
| `progress.sh` | Displays progress bars during waits |

All scripts live under `infra/scripts/utils/`.

---

## 🧰 Useful Commands

### Logs
~~~bash
docker logs context-machine-minio
docker logs context-machine-rabbitmq
docker logs context-machine-n8n
docker logs context-machine-neo4j
docker logs context-machine-neo4j-service
docker logs context-machine-analyzer-service
docker logs context-machine-websocket-service
docker logs context-machine-gitea
docker logs context-machine-ollama
docker logs context-machine-openwebui
~~~

### Cleanup
~~~bash
docker rm -f $(docker ps -aq --filter name=context-machine)
docker volume prune -f
docker network prune -f
~~~

---

## 🧠 Notes

- Scripts are **idempotent** — safe to re-run anytime  
- `.env.local` changes take effect on next `make up`  
- Gitea now auto-provisions a token for API automation  
- Ollama models persist under `infra/ollama/` and are only downloaded once  
- All services run locally; nothing is sent to external servers  

---

## 🧼 Troubleshooting

**Error:**  
`failed to bind port 0.0.0.0:11434`  
→ Ollama is already running locally. Either stop the host process or change the container port.  

**Progress bar not updating?**  
→ Check WebSocket service and API key. Test manually:  
~~~bash
echo '{"api_key":"dev-key-123","percent":42}' | nc localhost 3011
~~~

---

## 📜 License

**Business Source License 1.1 (BUSL 1.1)**  
Copyright (c) 2025 Jochen Schultz  

Licensed under the Business Source License 1.1 (the “License”).  
Full text: [https://mariadb.com/bsl11/](https://mariadb.com/bsl11/)

**Terms:**
- Internal & commercial use allowed for orgs ≤ **50 people**  
- Hosted/SaaS usage prohibited  
- Redistribution/resale prohibited  
- >50 employees → not permitted  

**Change Date:** October 4, 2028  
Automatically becomes **Apache License 2.0**

✅ Internal & small commercial use OK  
🚫 Large-scale/hosted use forbidden  
🕒 Open Source in 2028

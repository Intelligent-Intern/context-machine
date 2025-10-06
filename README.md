# Context Machine – Local Infrastructure Setup

This project provides a complete **local infrastructure** for the Context Machine ecosystem, including:

- **MinIO** – S3-compatible object storage  
- **RabbitMQ** – Message broker for event routing  
- **n8n** – Workflow automation engine  
- **Neo4j** – Graph database for knowledge representation  
- **Neo4j Service (Flask API)** – REST API for nodes, edges, and bulk operations  
- **Analyzer Service** – Multi-language source code analyzer with AST parsing and recursive tree analysis  
- **WebSocket Service** – Publishes real-time progress updates from the Analyzer for frontend dashboards  

All components run through Docker Compose and are automatically configured using setup scripts.

**For the moment the system basically enables you got get an AST graph from your code base.**

Create a folder called project and put your code inside to get this:

![alt text](code_graph.png)

No code is send anywhere - it all happens on your local machine without any AI stuff involved (yet - there will be but it will also run locally on your machine).


---

## 🚀 Quick Start

1. **Create `.env.local`**

   Example configuration:

   ~~~bash
   # Change all credentials before deploying to any public environment

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

   # Default n8n bootstrap user
   N8N_BOOTSTRAP_EMAIL=foo@example.com
   N8N_BOOTSTRAP_FIRSTNAME=bar
   N8N_BOOTSTRAP_LASTNAME=foo
   N8N_BOOTSTRAP_PASSWORD=A1234567
   N8N_BOOTSTRAP_ROLE=global:owner

   # Neo4j credentials
   NEO4J_AUTH=neo4j/test12345

   DB_SQLITE_POOL_SIZE=2

   # Analyzer ↔ Neo4j connection
   SERVICE_NEO4J_URI=bolt://context-machine-neo4j:7687
   SERVICE_NEO4J_AUTH=neo4j/test12345

   # WebSocket Service
   WS_HOST=0.0.0.0
   WS_PORT=3010
   ~~~

2. **Start the infrastructure**

   ~~~bash
   make up
   ~~~

   This command:
   - Builds all service containers  
   - Initializes MinIO, RabbitMQ, and n8n  
   - Starts Neo4j, Analyzer, and WebSocket services  

3. **Start the Project Analyzer**

   The Analyzer scans `/project` recursively, creates file/folder nodes in Neo4j,  
   and pushes real-time progress updates to the WebSocket service.

   ~~~bash
   curl -X POST http://localhost:3002/api/analyze \
     -H "Content-Type: application/json" \
     -H "X-API-Key: dev-key-123"
   ~~~

   The analyzer will:
   - Count all files and folders (excluding configured directories)  
   - Build the project tree structure in Neo4j (`:Folder` and `:File` nodes with `:CONTAINS` edges)  
   - Push progress updates (every 1%) to the WebSocket service at `ws://localhost:3010/progress`

   Example REST response:

   ~~~json
   {
     "status": "started",
     "path": "/project"
   }
   ~~~

   Example WebSocket progress messages:

   ~~~json
   {"percent": 1}
   {"percent": 50}
   {"percent": 100}
   ~~~

4. **Subscribe from your frontend**

   Connect your frontend via WebSocket:

   ~~~javascript
   const socket = new WebSocket("ws://localhost:3010/progress?api_key=dev-key-123");
   socket.onmessage = (event) => {
     const data = JSON.parse(event.data);
     console.log(`Progress: ${data.percent}%`);
     // update your progress bar here
   };
   ~~~

5. **Access Swagger UIs**

   - Neo4j Service: [http://localhost:3001/apidocs](http://localhost:3001/apidocs)  
   - Analyzer Service: [http://localhost:3002/apidocs](http://localhost:3002/apidocs)  
   *(Both require `X-API-Key` header for access)*

6. **Stop the infrastructure**

   ~~~bash
   make down
   ~~~

7. **Reset the environment**

   ~~~bash
   make reset
   ~~~

   This wipes all persistent data and recreates a clean environment.

---

## 🧩 Scripts

| Script | Purpose |
|--------|----------|
| `setup-minio.sh` | Creates MinIO buckets if missing |
| `setup-rabbitmq.sh` | Sets up vhost, users, exchanges, queues, bindings |
| `setup-minio-event.sh` | Configures AMQP notifications for MinIO |
| `setup-n8n.sh` | Bootstraps n8n and imports credentials |
| `container-utils.sh` | Builds Docker images for all services (Analyzer, Neo4j, WebSocket) |
| `messages.sh` | Provides colorized logging utilities |
| `progress.sh` | Displays progress bars during waits |
| `make/up.sh` | Executes the complete startup sequence |

All scripts are located under `infra/scripts/utils/`.

---

## 🧰 Useful Commands

### Check logs
~~~bash
docker logs context-machine-minio
docker logs context-machine-rabbitmq
docker logs context-machine-n8n
docker logs context-machine-neo4j
docker logs context-machine-neo4j-service
docker logs context-machine-analyzer-service
docker logs context-machine-websocket-service
~~~

### Clean up containers and volumes
~~~bash
docker rm -f $(docker ps -aq --filter name=context-machine)
docker volume prune -f
docker network prune -f
~~~

---

## 🧠 Notes

- Scripts are **idempotent** – safe to re-run  
- `.env.local` changes apply after restart  
- **Services:**
  - n8n → [http://localhost:5678](http://localhost:5678)
  - MinIO Console → [http://localhost:9001](http://localhost:9001)
  - RabbitMQ UI → [http://localhost:15672](http://localhost:15672)
  - Neo4j Browser → [http://localhost:7474](http://localhost:7474)
  - Neo4j REST API → [http://localhost:3001/apidocs](http://localhost:3001/apidocs)
  - Analyzer REST API → [http://localhost:3002/apidocs](http://localhost:3002/apidocs)
  - WebSocket Progress → [ws://localhost:3010/progress](ws://localhost:3010/progress)

---

## 🧼 Troubleshooting

**Error:** `overlapping prefixes/suffixes for the same event types`  
→ An existing MinIO event rule caused a conflict.  
The setup script automatically removes duplicates and re-applies the correct configuration.  
Just re-run `make up`.

**Progress bar not updating?**  
→ Ensure the WebSocket service is running and the frontend connects with a valid `api_key`.  
You can test updates manually:

~~~bash
echo '{"api_key":"dev-key-123","percent":42}' | nc localhost 3011
~~~

---

## 📜 License

**Business Source License 1.1 (BUSL 1.1)**  
Copyright (c) 2025 Jochen Schultz  

Licensed under the Business Source License 1.1 (the “License”).  
Full text: [https://mariadb.com/bsl11/](https://mariadb.com/bsl11/)

### Usage Terms
- Internal and commercial use permitted for **organizations with fewer than 50 total personnel** (including contractors and interns).  
- Hosted or public SaaS use **not permitted**.  
- Redistribution or resale **prohibited**.  
- Organizations with more than 50 personnel **must not** use this software.

### Enforcement
Companies violating these terms agree to a **usage fee equal to at least 50% of their annual revenue** as compensatory damages.  
Further legal action may be taken if necessary.

Report violations to **js@intelligent-intern.com**  
Verified reports will receive a **generous reward**.

**Change Date:** October 4, 2028  
→ Automatically converts to **Apache License 2.0**

✅ Internal & small commercial use (≤ 50 people) permitted  
🚫 Large-scale or hosted deployments prohibited  
🕒 Becomes Open Source under Apache 2.0 in 2028

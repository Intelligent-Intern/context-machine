# Context Machine – Local Infrastructure Setup

This project provides a complete **local infrastructure** for the Context Machine ecosystem, including:

- **MinIO** – S3-compatible object storage  
- **RabbitMQ** – Message broker for event routing  
- **n8n** – Workflow automation engine  
- **Neo4j** – Graph database for knowledge representation  
- **Neo4j Service (Flask API)** – REST API for nodes, edges, and bulk operations  
- **Analyzer Service** – Multi-language source code analyzer with AST parsing and recursive tree analysis  

All components run through Docker Compose and are automatically configured using setup scripts.

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
   ~~~

2. **Start the infrastructure**

   ~~~bash
   make up
   ~~~

   This command:
   - Builds all service containers  
   - Initializes MinIO, RabbitMQ, and n8n  
   - Starts Neo4j and Analyzer services with REST & Swagger UIs  

3. **Start the Project Analyzer**

   To recursively scan a project directory mounted at `/project` and push parsed data into Neo4j:

   ~~~bash
   curl -X POST http://localhost:3002/api/analyze \
     -H "Content-Type: application/json" \
     -H "X-API-Key: dev-key-123" \
     -d '{"path": "/project"}'
   ~~~

   The analyzer will:
   - Walk through all subdirectories  
   - Detect file types automatically  
   - Parse code using language-specific parsers  
   - Extract AST symbols and relationships  
   - Send all results in bulk to the Neo4j service  

   Example response:

   ~~~json
   {
     "status": "started",
     "path": "/project"
   }
   ~~~

   You can monitor progress with:

   ~~~bash
   docker logs -f context-machine-analyzer-service
   ~~~

   Once complete, open Neo4j Browser:  
   [http://localhost:7474](http://localhost:7474)

   ~~~cypher
   MATCH (f:File) RETURN f LIMIT 10;
   MATCH (a)-[r]->(b) RETURN a,b,r LIMIT 25;
   ~~~

4. **Access Swagger UIs**

   - Neo4j Service: [http://localhost:3001/apidocs](http://localhost:3001/apidocs)  
   - Analyzer Service: [http://localhost:3002/apidocs](http://localhost:3002/apidocs)  
   *(Both require `X-API-Key` header for access)*

5. **Stop the infrastructure**

   ~~~bash
   make down
   ~~~

6. **Reset the environment**

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
| `container-utils.sh` | Builds Docker images for all services |
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

---

## 🧼 Troubleshooting

**Error:** `overlapping prefixes/suffixes for the same event types`  
→ An existing MinIO event rule caused a conflict.  
The setup script automatically removes duplicates and re-applies the correct configuration.  
Just re-run `make up`.

**No edges appear in Neo4j?**  
→ Ensure the Neo4j Service is running before `/api/analyze`.  
The Analyzer sends edges only after nodes are merged.

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

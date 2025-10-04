# Context Machine – Local Infrastructure Setup

This project provides a complete **local infrastructure** for the Context Machine ecosystem, including:

- **MinIO** – S3-compatible object storage  
- **RabbitMQ** – Message broker for event routing  
- **n8n** – Workflow automation engine  
- **Neo4j** – Graph database for knowledge representation  
- **Neo4j Service (Flask API)** – REST API for nodes, edges, and bulk operations  
- **Analyzer Service** – Multi-language source code analyzer with AST parsing and symbol extraction  

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
   NEO4J_URI=bolt://context-machine-neo4j:7687
   NEO4J_USER=neo4j
   NEO4J_AUTH=neo4j/test12345
   NEO4J_DATABASE=neo4j

   DB_SQLITE_POOL_SIZE=2
   ~~~

2. **Start the infrastructure**

   ~~~bash
   make up
   ~~~

   This command:
   - Builds local service containers  
   - Initializes MinIO buckets  
   - Configures RabbitMQ (exchange, queue, bindings)  
   - Sets up MinIO → RabbitMQ AMQP notifications  
   - Bootstraps n8n with an admin account  
   - Starts Neo4j and Analyzer services with REST & Swagger UI  

3. **Access Swagger UIs**

   - Neo4j Service: [http://localhost:3001/apidocs](http://localhost:3001/apidocs)  
   - Analyzer Service: [http://localhost:3002/apidocs](http://localhost:3002/apidocs)  
   *(Both require an `X-API-Key` header for authentication)*

4. **Stop the infrastructure**

   ~~~bash
   make down
   ~~~

5. **Reset the environment**

   ~~~bash
   make reset
   ~~~

   This wipes all persistent data (volumes) and recreates a clean setup.

---

## 🧩 Scripts

| Script | Purpose |
|--------|----------|
| `setup-minio.sh` | Creates MinIO buckets if missing |
| `setup-rabbitmq.sh` | Sets up vhost, users, exchanges, queues, bindings |
| `setup-minio-event.sh` | Configures AMQP notifications for MinIO |
| `setup-n8n.sh` | Bootstraps n8n and imports credentials |
| `container-utils.sh` | Builds Docker images for local services |
| `messages.sh` | Provides colorized logging utilities |
| `progress.sh` | Displays progress bars during waits |
| `make/up.sh` | Executes the complete environment startup process |

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

- All scripts are **idempotent** – safe to re-run any time  
- Changes to `.env.local` take effect on next startup  
- Services:
  - **n8n** → [http://localhost:5678](http://localhost:5678)
  - **MinIO Console** → [http://localhost:9001](http://localhost:9001)
  - **RabbitMQ UI** → [http://localhost:15672](http://localhost:15672)
  - **Neo4j Browser** → [http://localhost:7474](http://localhost:7474)
  - **Neo4j REST API** → [http://localhost:3001/apidocs](http://localhost:3001/apidocs)
  - **Analyzer API** → [http://localhost:3002/apidocs](http://localhost:3002/apidocs)

---

## 🧼 Troubleshooting

**Error:** `overlapping prefixes/suffixes for the same event types`  
→ This occurs when an event rule already exists in MinIO.  
The setup script automatically removes duplicates and re-applies the configuration.  
Simply rerun the script or execute `make up` again.

---

## 📜 License

**Business Source License 1.1 (BUSL 1.1)**  
Copyright (c) 2025 Jochen Schultz  

Licensed under the Business Source License 1.1 (the “License”).  
Full license text available at: [https://mariadb.com/bsl11/](https://mariadb.com/bsl11/)

### Usage Terms
- Internal and commercial use is permitted **for organizations with fewer than 50 total personnel**, including contractors, interns, and temporary staff.  
- Hosted SaaS or publicly accessible deployments are **not allowed**.  
- Redistribution, sublicensing, or resale is **prohibited**.  
- Organizations with more than 50 personnel **must not** use this software.

### Enforcement
Companies exceeding the 50-person limit that use this software agree to a **usage fee equal to at least 50% of their annual revenue** as compensatory damages.  
Further legal action may be pursued if necessary.

Report license violations or unauthorized use to **js@intelligent-intern.com**  
Substantial verified reports will receive a **generous reward**.

**Change Date:** October 4, 2028  
→ Automatically converts to **Apache License 2.0**

✅ Internal & small commercial use (≤ 50 people) permitted  
🚫 Large-scale or hosted deployments prohibited  
🕒 Becomes Open Source under Apache 2.0 in 2028

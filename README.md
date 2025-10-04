# Context Machine – Local Infrastructure Setup

Dieses Projekt bringt eine kleine lokale Infrastruktur zum Laufen, bestehend aus:

- **MinIO** – S3-kompatibler Objektspeicher  
- **RabbitMQ** – Message Broker für Event-Weiterleitung  
- **n8n** – Workflow-Automation  
- **Neo4j** – Graphdatenbank  
- **Neo4j Service (Flask API)** – REST-API für Nodes, Edges und Bulk-Operationen

Alles wird über Docker Compose gestartet und mit Setup-Skripten automatisch konfiguriert.

---

## 🚀 Schnellstart

1. **`.env.local` erstellen**

   Beispiel:

   ~~~bash
   # change the api key and credentials before putting it online

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

2. **Infrastruktur starten**

   ~~~bash
   make up
   ~~~

   Das startet alle Container und führt automatisch:
   - MinIO Bucket-Setup  
   - RabbitMQ Setup (Exchange, Queue, Binding)  
   - MinIO AMQP-Benachrichtigungen  
   - n8n Bootstrap mit Admin-Benutzer  
   - Neo4j-Service mit REST-API & Swagger UI  

3. **Swagger UI aufrufen**

   [http://localhost:3001/apidocs](http://localhost:3001/apidocs)  
   *(Authentifizierung per Header `X-API-Key`)*

4. **Infrastruktur stoppen**

   ~~~bash
   make down
   ~~~

5. **Reset**

   ~~~bash
   make reset
   ~~~

---

## 🧩 Skripte

| Script | Aufgabe |
|--------|----------|
| `setup-minio.sh` | Erstellt Bucket in MinIO |
| `setup-rabbitmq.sh` | Erstellt VHost, User, Exchange, Queue, Binding |
| `setup-minio-event.sh` | Konfiguriert AMQP-Events in MinIO |
| `setup-n8n.sh` | Bootstrapped n8n & importiert Credentials |
| `messages.sh` | Logging Utilities |
| `progress.sh` | Fortschrittsbalken |
| `container-utils.sh` | Baut & startet lokale Container |
| `make/up.sh` | Führt gesamten Startprozess durch |

Alle Skripte liegen unter `infra/scripts/utils/`.

---

## 🧰 Nützliche Befehle

~~~bash
docker logs context-machine-minio
docker logs context-machine-rabbitmq
docker logs context-machine-n8n
docker logs context-machine-neo4j
docker logs context-machine-neo4j-service
~~~

Aufräumen:

~~~bash
docker rm -f $(docker ps -aq --filter name=context-machine)
docker volume prune -f
docker network prune -f
~~~

---

## 🧠 Hinweise

- Skripte sind **idempotent**  
- `.env.local` Änderungen greifen beim Neustart  
- n8n: [http://localhost:5678](http://localhost:5678)  
- MinIO Console: [http://localhost:9001](http://localhost:9001)  
- RabbitMQ UI: [http://localhost:15672](http://localhost:15672)  
- Neo4j Browser: [http://localhost:7474](http://localhost:7474)  
- Neo4j-Service API: [http://localhost:3001/apidocs](http://localhost:3001/apidocs)

---

## 🧼 Troubleshooting

**Fehler:** `overlapping prefixes/suffixes for the same event types`  
→ Alte Event-Regel, wird durch Skript automatisch gelöscht. Einfach nochmal ausführen.

---

## 📜 Lizenz

Business Source License 1.1 (BUSL 1.1)  
Copyright (c) 2025 Jochen Schultz  

Licensed under the Business Source License 1.1 (the “License”).  
You may obtain a copy at: [https://mariadb.com/bsl11/](https://mariadb.com/bsl11/)

**Usage Terms**
- Interne und kommerzielle Nutzung erlaubt, **solange die Organisation weniger als 50 Mitarbeitende** hat (einschließlich Praktikanten, Werkstudenten und externer Kräfte).  
- Keine gehostete Bereitstellung als SaaS oder öffentlich zugänglicher Dienst.  
- Keine Weitergabe oder Sub-Lizenzierung.  
- Für größere Organisationen (> 50 Personen) ist eine Nutzung untersagt.  

**Change Date:** October 4, 2028  
→ Automatisch Apache 2.0

✅ interne & kleine kommerzielle Nutzung (≤ 50 Personen) erlaubt  
🚫 Nutzung durch größere Organisationen verboten

Firmen mit mehr als 50 Mitarbeitern, die das System trotzdem einsetzen, erkennen eine Nutzungsgebühr von mindestens 50 % ihres Jahresumsatzes als Schadensersatzgrundlage an. Weitere rechtliche Schritte bleiben vorbehalten.

Hinweise zu Verstößen oder unautorisierter Nutzung bitte an: js@intelligent-intern.com

Für belegte Hinweise wird eine großzügige Belohnung ausgesetzt.

🕒 wird 2028 Open Source (Apache 2.0)

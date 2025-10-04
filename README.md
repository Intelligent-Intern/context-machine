# Context Machine – Local Infrastructure Setup

Dieses Projekt bringt eine kleine lokale Infrastruktur zum Laufen, bestehend aus:

- **MinIO** – S3-kompatibler Objektspeicher  
- **RabbitMQ** – Message Broker für Event-Weiterleitung  
- **n8n** – Workflow-Automation  
- **Neo4j** – Graphdatenbank  

Alles wird über Docker Compose gestartet und mit ein paar Setup-Skripten automatisch konfiguriert.

---

## 🚀 Schnellstart

1. **.env.local erstellen**

   Erstelle im Projektverzeichnis eine Datei `.env.local` mit deinen Einstellungen.  
   Beispiel:

   ~~~bash
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

   N8N_BOOTSTRAP_EMAIL=foo@example.com
   N8N_BOOTSTRAP_FIRSTNAME=Bar
   N8N_BOOTSTRAP_LASTNAME=Foo
   N8N_BOOTSTRAP_PASSWORD=A1234567
   N8N_BOOTSTRAP_ROLE=global:owner

   # Neo4j
   NEO4J_AUTH=neo4j/test12345
   ~~~

2. **Infrastruktur starten**

   ~~~bash
   make up
   ~~~

   Das startet alle Container und führt automatisch die folgenden Schritte aus:
   - MinIO Bucket erstellen  
   - RabbitMQ Exchange/Queue/Binding einrichten  
   - MinIO AMQP-Benachrichtigungen konfigurieren  
   - n8n mit Admin-User bootstrappen und Credentials (RabbitMQ, MinIO) importieren  

---

## 🧩 Skripte

| Script | Aufgabe |
|--------|----------|
| `setup-minio.sh` | Erstellt Bucket in MinIO falls nicht vorhanden |
| `setup-rabbitmq.sh` | Erstellt VHost, User, Exchange, Queue, Binding |
| `setup-minio-event.sh` | Konfiguriert AMQP-Events in MinIO |
| `setup-n8n.sh` | Bootstrapped n8n, setzt Admin-Account, importiert Credentials |
| `messages.sh` | Logging-Utils für farbige Ausgabe |
| `progress.sh` | Fortschrittsbalken für Wartezeiten |

Alle Skripte liegen unter `infra/scripts/utils/` und werden automatisch durch `make up` oder `infra/start.sh` ausgeführt.

---

## 🧰 Nützliche Befehle

- Logs prüfen:
  ~~~bash
  docker logs context-machine-minio
  docker logs context-machine-rabbitmq
  docker logs context-machine-n8n
  docker logs context-machine-neo4j
  ~~~

- Umgebung aufräumen:
  ~~~bash
  make clean
  ~~~
  oder:
  ~~~bash
  docker rm -f $(docker ps -aq --filter name=context-machine)
  docker volume prune -f
  docker network prune -f
  ~~~

---

## 🧠 Hinweise

- Skripte sind **idempotent** – du kannst `make up` beliebig oft ausführen.  
- Änderungen an `.env.local` greifen beim nächsten Start automatisch.  
- `n8n` wird nach der Einrichtung über [http://localhost:5678](http://localhost:5678) erreichbar.  
- Die MinIO Console läuft auf [http://localhost:9001](http://localhost:9001) (Login mit `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`).  
- RabbitMQ Management UI: [http://localhost:15672](http://localhost:15672).  
- Neo4j Browser: [http://localhost:7474](http://localhost:7474).

---

## 🧼 Troubleshooting

Falls `setup-minio-event.sh` einmal den Fehler  
`overlapping prefixes/suffixes for the same event types` wirft:  
das passiert, wenn bereits eine Event-Regel existiert. Das Skript entfernt solche Regeln automatisch – einfach nochmal starten.

---

## 📜 Lizenz

Interner Gebrauch. Kein öffentlicher Release, keine Gewähr.


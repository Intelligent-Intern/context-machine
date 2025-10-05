# ./services/neo4j-service/Dockerfile

FROM python:3.12-slim

WORKDIR /app

# System dependencies für Neo4j-Driver & Debug-Tools
RUN apt-get update && apt-get install -y build-essential net-tools iproute2 iputils-ping && rm -rf /var/lib/apt/lists/*

# Requirements kopieren
COPY requirements.txt .

# Python-Pakete installieren
RUN pip install --no-cache-dir -r requirements.txt

# Quellcode kopieren (Code wird per Volume überschrieben)
COPY src ./src

# Port für Flask API
EXPOSE 3001

# Startbefehl
CMD ["python", "-u", "src/app.py"]

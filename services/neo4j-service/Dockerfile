# ./services/neo4j-service/Dockerfile

FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for watchdog (for hot reload)
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

# Copy requirements only (code will be mounted as a volume)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir watchdog

# Environment
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=src/app.py
ENV FLASK_ENV=development
ENV FLASK_DEBUG=1
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=3001

# Expose port
EXPOSE 3001

# Start Flask with hot reload
CMD ["flask", "run", "--reload"]

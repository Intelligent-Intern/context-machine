# ./services/analyzer-service/Dockerfile

FROM python:3.12-slim

WORKDIR /app

# System dependencies for AST parsing (tree-sitter etc.)
RUN apt-get update && apt-get install -y build-essential git && rm -rf /var/lib/apt/lists/*

# Copy only requirements (source will be mounted as a volume during development)
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
ENV FLASK_RUN_PORT=3002

# Expose port
EXPOSE 3002

# Run Flask in hot-reload mode
CMD ["flask", "run", "--reload"]

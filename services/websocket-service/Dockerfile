# ./services/websocket-service/Dockerfile

FROM python:3.12-slim

WORKDIR /app

# Install tools for debugging (netstat, ss, ping, etc.)
RUN apt-get update && apt-get install -y net-tools iproute2 iputils-ping && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source (hot reload via volume)
COPY src ./src

# Expose ports
EXPOSE 3010
EXPOSE 3011

CMD ["python", "src/app.py"]

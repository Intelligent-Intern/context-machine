FROM python:3.12-slim

WORKDIR /app

# Install debug tools
RUN apt-get update && apt-get install -y net-tools iproute2 iputils-ping && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source (hot reload via volume)
COPY src ./src

# Environment
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 3006

CMD ["flask", "run", "--reload", "--host=0.0.0.0", "--port=3006"]
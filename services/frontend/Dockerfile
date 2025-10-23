# Frontend Dockerfile for Context Machine  
FROM node:22.12-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Clean install dependencies with Node 22
RUN npm ci --only=production=false

# Copy source code (excluding node_modules)
COPY . .

# Expose port
EXPOSE 5173

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
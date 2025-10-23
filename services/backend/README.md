# Context Machine Backend Service

**Port:** 3006  
**Purpose:** Lightweight API Gateway and Backend Orchestrator for Context Machine Frontend

## Overview

The Context Machine Backend Service is a **super lightweight** API Gateway that provides the unified messaging interface for the Vue 3 frontend. It's designed to be minimal and focused - handling authentication, message routing, and frontend configuration delivery.

This service does NOT use the existing analyzer/neo4j services directly. Instead, it orchestrates specialized frontend-focused services that provide module-specific functionality for the dynamic UI system.

## File Structure

```
services/backend/
├── src/
│   ├── app.py                 # Main Flask application
│   └── service/
│       ├── auth.py           # JWT authentication service
│       ├── message.py        # Message routing service
│       └── pub.py            # WebSocket publishing service
├── Dockerfile                # Container definition with hot-reload
├── requirements.txt          # Python dependencies
└── README.md                # This documentation
```

## Architecture Philosophy

The backend is **super lightweight** and follows these principles:

- **Minimal Core** - Only auth, message routing, and WebSocket publishing
- **Frontend-First** - Specialized services for frontend modules only
- **Configuration Delivery** - Auth returns complete page/module config for user
- **Message Orchestration** - Routes to frontend-specific services, not existing analyzer services

## Core Responsibilities

### 1. Authentication & Configuration Delivery

- **JWT Authentication** - Simple login/logout with token validation
- **User Configuration** - Auth returns complete frontend config (pages, modules, widgets)
- **No User Storage** - Hardcoded users for now, no database needed

### 2. Message Routing

Single `/api/message` endpoint routes to **frontend-specific services only**:

```json
[{"a": "chat.send", "p": {"message": "Hello"}}]
```

Routes to specialized frontend services (NOT existing analyzer/neo4j services):

| Action Prefix | Target Service | Purpose |
|---------------|----------------|---------|
| `chat.*` | Chat Module Service | Chat functionality |
| `navigation.*` | Navigation Service | Menu and routing |
| `dashboard.*` | Dashboard Service | Main app dashboard |

### 3. WebSocket Publishing

- **Pub Service** - Publishes events to WebSocket Service
- **Event Forwarding** - Routes service responses to frontend via WebSocket
- **No Direct WebSocket** - Uses existing WebSocket Service for delivery

## Example: Chat Module Integration

### Chat Module Manifest (returned by auth)

```json
{
  "modules": [
    {
      "id": "chat",
      "name": "Chat Module",
      "pages": ["/chat"],
      "widgets": ["chat@MessageList", "chat@InputBox"]
    }
  ],
  "pages": [
    {
      "route": "/chat", 
      "layout": {"top": true, "main": true},
      "widgets": {
        "top": ["navigation@TopBar"],
        "main": ["chat@ChatInterface"]
      }
    }
  ]
}
```

### Chat Service Integration

Backend routes `chat.*` actions to a dedicated Chat Module Service:

- `chat.send` → Chat Service handles message
- Chat Service responds via WebSocket: `{"a": "chat.message", "p": {...}}`

## Minimal Implementation Plan

### Task 1: Core Backend Service
- `app.py` with Flask + Flasgger
- `service/auth.py` - JWT + hardcoded users + config delivery
- `service/message.py` - Message routing
- `service/pub.py` - WebSocket publishing
- Dockerfile with hot-reload

### Task 2: Docker Integration  
- Add to docker-compose.yml
- Update container-utils.sh
- Health checks and networking

### Task 3: Frontend Configuration
- Auth returns complete page/module/widget config
- Test with simple chat module manifest
- Swagger docs accessible at http://localhost:3006/apidocs

## Authentication Response Example

When user logs in, auth service returns complete frontend configuration:

```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "admin",
    "name": "Administrator", 
    "permissions": ["chat", "admin"]
  },
  "config": {
    "modules": [
      {
        "id": "navigation",
        "name": "Navigation",
        "widgets": ["navigation@TopBar", "navigation@SideMenu"]
      },
      {
        "id": "chat", 
        "name": "Chat Module",
        "pages": ["/chat"],
        "widgets": ["chat@MessageList", "chat@InputBox", "chat@ChatInterface"]
      }
    ],
    "pages": [
      {
        "route": "/",
        "layout": {"top": true, "main": true},
        "widgets": {
          "top": ["navigation@TopBar"],
          "main": ["dashboard@Welcome"]
        }
      },
      {
        "route": "/chat",
        "layout": {"top": true, "main": true},
        "widgets": {
          "top": ["navigation@TopBar"], 
          "main": ["chat@ChatInterface"]
        }
      }
    ],
    "widgetPacks": [
      {
        "id": "navigation",
        "components": {
          "TopBar": {"path": "./components/TopBar.vue"},
          "SideMenu": {"path": "./components/SideMenu.vue"}
        }
      },
      {
        "id": "chat",
        "components": {
          "ChatInterface": {"path": "./components/ChatInterface.vue"},
          "MessageList": {"path": "./components/MessageList.vue"},
          "InputBox": {"path": "./components/InputBox.vue"}
        }
      }
    ]
  }
}
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login and get JWT + frontend config
- `GET /api/health` - Health check
- `GET /apidocs` - Swagger documentation

### Message Gateway  
- `POST /api/message` - Unified message endpoint for all frontend actions

### Example Usage

```bash
# Login and get frontend configuration
curl -X POST http://localhost:3006/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}'

# Send message (requires JWT token)
curl -X POST http://localhost:3006/api/message \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '[{"a": "chat.send", "p": {"message": "Hello World"}}]'

# View Swagger docs
open http://localhost:3006/apidocs
```

## Technology Stack

- **Flask** - Lightweight web framework
- **PyJWT** - JWT token handling  
- **Flasgger** - Swagger documentation
- **Requests** - HTTP client for service communication

## Environment Variables

```bash
# Service Configuration  
BACKEND_PORT=3006
JWT_SECRET_KEY=your-secret-key-here
WEBSOCKET_SERVICE_URL=http://context-machine-websocket-service:3010
API_KEY=dev-key-123
```

## Summary

This is a **super lightweight** backend service focused on:

1. **JWT Authentication** with frontend configuration delivery
2. **Message Routing** to frontend-specific services  
3. **WebSocket Publishing** for real-time responses
4. **Minimal Dependencies** - No database, no complex integrations
5. **Hot-Reload Development** - Fast iteration cycles

The service enables the frontend to be completely data-driven while keeping the backend implementation as simple as possible. All complexity is pushed to specialized frontend module services that can be developed independently.
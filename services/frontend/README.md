# Context Machine Frontend and Backend Architecture Plan

## Overview

This document provides a detailed architectural overview of the Context Machine platform, focusing on the **frontend architecture**, its **runtime discovery mechanism**, and how it interacts with the **backend microservices** through a unified message-based communication layer.  

It serves as a technical onboarding guide for developers joining the Context Machine project, particularly those who will work on the frontend (`services/frontend`) or the integration points between the frontend and backend.

It took a long time to consider the right tooling for this - luckily and kind of by recommendation of a highly skilled ex colleague I've decided to give vue3 a shot after experimenting with Angular JS -> Angular and many years with React.

So here is why vue:

## Frontend Framework Comparison

*(Vue 3 vs React 18 vs Angular 17, focused on extensible modular apps)*

| **Aspect** | **Vue 3 (+ Vite)** | **React 18 (+ Vite or Next)** | **Angular 17 (+ CLI)** |
|-------------|--------------------|--------------------------------|-------------------------|
| **Core Paradigm** | Reactive composition API, declarative templates | Functional UI with hooks & JSX | Class-based components (decorators) + DI + RxJS |
| **Learning Curve** | Moderate; intuitive template syntax | Easy to start, but hooks and state mgmt add complexity | Steeper; strong conventions & TypeScript boilerplate |
| **Architecture Fit for Context Machine** | Excellent: supports runtime component registration, dynamic imports, fine-grained reactivity for manifest-driven widgets | Good: flexible, can handle dynamic imports but requires more plumbing (lazy loading, context handling) | Fair: rigid module boundaries make runtime component injection harder; suited to large enterprise UIs, not dynamic manifests |
| **Dynamic Module Loading** | Native via `defineAsyncComponent`, ideal for manifest-discovered widgets | Supported through `React.lazy` + `Suspense`; more manual state wiring | Possible via NgModules & lazy routes, but heavy |
| **Reactive State Management** | Pinia / Vuex 5 (small, reactive, store-based) | Redux Toolkit / Zustand / Jotai (flexible, fragmented) | Built-in RxJS Observables + NgRx |
| **Two-Way Binding** | Native `v-model`, convenient for interactive widgets | Not built-in; manual prop + callback pattern | Built-in via `[(ngModel)]`, strongly typed |
| **Templating & Readability** | Clear separation of template and logic (`<template>` + `<script setup>`) | JSX mixes HTML + JS logic (powerful but noisy) | HTML templates + TS controllers; verbose |
| **Tooling & Build** | Vite is default: fast HMR, small bundles | Vite or Next.js: mature ecosystem | Angular CLI + Webpack: slower builds, heavy |
| **TypeScript Integration** | First-class in Vue 3 | First-class; excellent tooling | Native; framework written in TS |
| **Performance** | Reactive core, fine-grained updates (no virtual DOM diffing overhead) | Virtual DOM diffing; good batching in React 18 concurrent mode | Change-detection zones; more overhead for small widgets |
| **Ecosystem / Libraries** | Smaller than React but cohesive; VueUse, Vuetify, Naive UI, Tailwind integration | Largest ecosystem; almost any library available | Mature enterprise libs (Material, NgRx, Forms) |
| **Testing** | Vitest / Vue Test Utils | Jest / React Testing Library | Jasmine / Karma (heavier) |
| **SSR / SSG** | Nuxt 3 | Next.js | Angular Universal |
| **Learning Resources / Community** | Rapidly growing, clear documentation | Massive community, huge ecosystem | Stable, slower innovation cycle |
| **Suitability for Manifest-Driven UI Composition** | Native support: dynamic components + reactive layout make it easy to render from JSON manifests | Feasible but requires custom registry/context system | Possible but awkward; Angular prefers compile-time structure |
| **Runtime Extensibility (Widget Packs)** | Straightforward: dynamic imports and global component registry (`app.component`) | Needs manual module registry or context provider | Requires NgModule registration & recompilation |
| **Maintenance Overhead** | Low; small, clean core | Medium; frequent ecosystem churn | High; heavy scaffolding and version coupling |
| **Overall Fit for Context Machine** | **Excellent** — flexible, reactive, minimal boilerplate, perfect for runtime-discoverable pages | **Good** — powerful but more work for dynamic injection and message binding | **Limited** — better for static enterprise apps than for modular runtime systems |



---

## 1. Frontend Architecture Overview

The Context Machine frontend is a **single-page application (SPA)** built using **Vue 3 + TypeScript**, bundled with **Vite**.  
Its design philosophy emphasizes **modularity**, **runtime configurability**, and **dynamic UI composition**.  

The frontend is not a traditional static SPA. Instead, it dynamically builds its structure at runtime from **page and module manifests** delivered as JSON data. This enables the UI to self-reconfigure based on backend-discovered modules and features.

---

### 1.1 Core Application Structure

At the highest level, the frontend renders an `AppShell` component that defines the layout skeleton of the UI.  
The AppShell consists of the following regions:

- Top bar  
- Bottom bar  
- Left sidebar  
- Right sidebar  
- Main content area  

Each of these regions can dynamically contain one or more **widget components**, determined by the currently active page’s configuration.

The frontend follows these main organizational layers:

- **Dynamic Page System:** Pages and layouts are defined via JSON manifests, not hardcoded routes.  
- **Widget Packs:** Modular collections of reusable UI components.  
- **Global State Management:** Handled via Pinia stores (layout, discovery, user, permissions, etc.).  
- **Reactive Event Pipeline:** Unified message dispatcher handling incoming and outgoing backend messages.  
- **AppShell Layout Mechanism:** A responsive grid that dynamically populates regions with widgets.  

---

### 1.2 Dynamic Page Manifests

Each page in the application is defined by a **Page Manifest** — a JSON object describing its route, layout, and widget composition.

Pages are not statically defined in the Vue Router. Instead, the router is populated at runtime based on manifests discovered either locally or from the backend.

Each page manifest includes:

- `route` — the path (e.g., `/`, `/about`, `/app/graph`)  
- `layout_config` — compact layout definition with bars and ports
- `widgets` — which components populate each region  

#### Compact Layout Format

The layout format has been optimized for brevity:

```json
{
  "bars": {"t": 2, "b": 0, "l": 2, "r": 0},
  "ports": {
    "t": ["nav@TopBar"],
    "l": ["nav@SidebarNav"], 
    "m": ["dashboard@Welcome"]
  }
}
```

Where:
- **bars**: `t`=top, `b`=bottom, `l`=left, `r`=right (0=hidden, 1=collapsed, 2=visible)
- **ports**: `t`=top, `l`=left, `r`=right, `b`=bottom, `m`=main
- **widgets**: Direct string format `pack@Widget` instead of object notation

Widgets are referenced using the compact format:
- `nav@TopBar` (navigation pack, TopBar widget)
- `dashboard@Welcome` (dashboard pack, Welcome widget)
- `theme@ThemeEditor` (theme pack, ThemeEditor widget)

Multiple widgets in a port are ordered by array position:
```json
"m": ["dashboard@Welcome", "stats@Overview", "charts@Graph"]
```

At runtime, the frontend resolves these references through the **Widget Registry**, dynamically importing and mounting the relevant components.

This design means the UI can **discover and reconfigure itself** based on the available modules and features provided at runtime by the backend.

---

### 1.3 Modules and Widget Packs

Modules define **feature sets** (such as Code Graph Viewer, AI Chat, Workflow Automation, etc.), while **Widget Packs** define reusable UI elements.

Each module can:

- Provide navigation entries for the site’s menu  
- Contribute new pages (each with its own manifest)  
- Register its own widget pack containing feature-specific components  

Example:

- `site` module → general site pages (Home, About, Contact)  
- `graph` module → AST visualization widgets and pages  
- `workflow` module → automation UI integrated with n8n  

Modules and widget packs are declared via JSON manifests. The frontend “discovers” them on startup, typically through a discovery API call (e.g., `discovery.module.list`) that returns their definitions.

Because widgets are referenced symbolically (`pack@Component`), new widget packs can be added without modifying the core application code. The frontend just needs to register them in the Widget Registry.

---

### 1.4 Global State and Stores

Global application state is managed via **Pinia** stores. Key stores include:

- **layoutStore:** Controls which layout regions are active, their sizes, and how widgets are distributed.  
- **discoveryStore:** Maintains the list of available pages, modules, and widgets discovered from the backend.  
- **userStateStore:** Tracks user preferences, authentication state, and session data.  
- **permissionsStore:** Stores the list of defined permissions and which ones the current user has.  
- **apiStore:** Handles outbound API message batching and sending.  
- **notificationStore:** Manages transient system messages and alerts.  

Each store is reactive and subscribes to relevant WebSocket messages from the backend. For example, when the backend sends `user.permissions.list`, the permissions store updates automatically.

---

### 1.5 Layout Mechanism and AppShell

The `AppShell.vue` component defines the high-level page structure using a responsive CSS grid.  
Each grid region (top, bottom, left, right, main) renders a `PortContainer` which loops through the widgets assigned to that region.

Widget rendering is conditional:  
Widgets can define `visibleWhen` conditions — logical expressions evaluated against the current application state (for example, showing certain elements only for logged-in users).

The `layoutStore` determines which bars are visible and drives reactive resizing, collapsing, or hiding of UI regions depending on the current page manifest.

This approach allows the UI to automatically adjust to different page layouts — for example:

- A home page might use a full-width layout with no sidebars.  
- An app page might display toolbars and navigation sidebars.  
- A results page might show split panels with graphs and data.

---

### 1.6 Internationalization and Theming

The frontend includes a lightweight internationalization layer using Vue I18n and a theme store that persists user-selected themes.  

Both are initialized during app startup and integrated into global state so they can influence widget rendering and style dynamically.

---

### 1.7 Architectural Summary

The frontend architecture can be summarized as:

- **Data-driven** — UI structure is described by manifests, not hardcoded.  
- **Extensible** — New modules and widgets can be added without touching core code.  
- **Reactive** — Layout and data update dynamically as backend messages arrive.  
- **Backend-dependent** — The frontend expects the backend to describe the available pages, modules, and data.  

This architecture supports an evolving, intelligent UI that can adapt as new capabilities are delivered by the backend.

---

## 2. Frontend–Backend Communication

The frontend communicates with the backend through a **unified messaging layer** that abstracts away individual API endpoints.  
The communication channels are:

- **HTTP POST** → used for sending outbound actions to `/api/message`  
- **WebSocket** → used for receiving asynchronous responses and real-time events  

This mechanism decouples the frontend from microservice-specific APIs and treats the backend as a single event-driven interface.

---

### 2.1 Outgoing Requests (Actions)

When the user performs an action requiring backend processing (e.g., “Start Analysis”), the frontend sends a JSON message through the unified API endpoint.

Format of outgoing messages:

~~~
[
  {
    "a": "namespace.entity.action",
    "p": { ...payload... }
  },
  ...
]
~~~

Example:

~~~
[
  {
    "a": "analyzer.run",
    "p": { "project": "my-app" }
  }
]
~~~

The frontend posts these to `/api/message`.  
The backend responds immediately with a simple acknowledgment (e.g., HTTP 200), while the **actual response** arrives later over the WebSocket channel.

This means all meaningful responses are asynchronous.

---

### 2.2 Incoming Responses (Events)

The frontend maintains a persistent WebSocket connection (default: `ws://<host>/ws`) which receives JSON events structured as:

~~~
{
  "a": "namespace.entity.event",
  "p": { ...payload... }
}
~~~

Incoming messages are dispatched through a central **message dispatcher**.  
The dispatcher parses the `a` (action) field, determines which store or handler should process it, and updates the state accordingly.

Examples:

- `discovery.page.list` → handled by `discoveryStore` to update available pages  
- `user.permissions.list` → handled by `permissionsStore`  
- `analysis.progress` → handled by `notificationStore` or progress UI  

The dispatcher acts as a **publish-subscribe bus** on the client side, enabling loosely coupled updates.

---

### 2.3 Expected Backend Data

The frontend is data-driven and relies on specific message types from the backend to function properly.  
The main categories of expected data are:

1. **Page and Module Manifests**  
   Used to dynamically register navigation routes and widgets.  
   Action: `discovery.module.list`, `discovery.page.list`

2. **User Authentication and Preferences**  
   Manages session, preferences, permissions.  
   Actions: `user.state.get`, `user.permissions.list`, `user.permissions.granted`

3. **Real-time Progress and Notifications**  
   Used for analysis progress bars or long-running tasks.  
   Actions: `analysis.progress`, `analysis.complete`, etc.

4. **Code Graph Data (AST)**  
   Data from Neo4j describing source code structure and relationships.  
   Actions: `graph.nodes.list`, `graph.symbol.get`, etc.

5. **Workflow and Integration Data**  
   Information from connected services like n8n or Gitea.  
   Actions: `workflow.list`, `workflow.run`, etc.

The backend must produce all data in JSON format, matching frontend expectations for field names and schema structures.

---

### 2.4 Example Interaction Flow

1. **User Action**  
   The user clicks “Start Analysis”.

2. **Frontend Request**  
   Frontend sends  
   ~~~
   { "a": "analyzer.run", "p": { "project": "my-app" } }
   ~~~  
   via POST `/api/message`.

3. **Backend Processing**  
   The Analyzer service begins analysis asynchronously and sends progress updates to the WebSocket service.

4. **Frontend Update**  
   The frontend receives  
   ~~~
   { "a": "analysis.progress", "p": { "percent": 50 } }
   ~~~  
   and updates the progress bar.

5. **Completion**  
   When done, the backend sends  
   ~~~
   { "a": "analysis.complete", "p": { "summary": {...} } }
   ~~~  
   possibly followed by graph data or a new page manifest to display results.

---

## 3. Backend Architecture Overview

The backend is composed of multiple **microservices** managed via Docker Compose.  
Each service handles a specific concern, and together they form a **modular service layer** behind a unified messaging gateway.

Core backend components include:

- API Gateway / Message Router  
- Authentication and User Service  
- Analyzer Service  
- Neo4j Graph Service  
- WebSocket Notification Service  
- Workflow Integration (n8n)  
- Git Integration (Gitea)  
- File Storage (MinIO + RabbitMQ)  
- AI Integration (Ollama + OpenWebUI)  

---

### 3.1 API Gateway / Message Router

The API Gateway exposes a single endpoint `/api/message` for all frontend requests.  
Its responsibilities:

- Parse incoming JSON batches of action messages  
- Authenticate the request (API key or JWT)  
- Dispatch each message to the appropriate backend service  
- Route responses or events back to the WebSocket service  

Routing logic example:

| Action Prefix | Responsible Service |
|----------------|---------------------|
| discovery.* | Core/Gateway |
| user.* | Auth Service |
| analyzer.* | Analyzer Service |
| graph.* | Neo4j Service |
| workflow.* | Workflow Integration |
| ai.* | AI Service |

The gateway can be implemented in **Python (FastAPI)** or **Node.js (Express/NestJS)**.  
It must support both HTTP and WebSocket (or interface with the existing WebSocket service).

---

### 3.2 Authentication and User Service

Handles user management, authentication, and permission control.  

Responsibilities:

- Validate user credentials (via Keycloak or internal JWT system)  
- Issue and verify access tokens  
- Provide user profile and preference data  
- Manage permission definitions and granted permissions  

Frontend actions:  
- `user.state.get` → returns user preferences  
- `user.state.update` → persists updates  
- `user.permissions.list` → returns all possible permissions  
- `user.permissions.granted` → returns current user’s permissions  

Implementation options:

- **Keycloak** (recommended for production, full OAuth2 provider)  
- **Custom lightweight auth** (JWT-based for local development)  

User preferences can be persisted in a small relational DB (SQLite/Postgres) or in Keycloak custom attributes.

---

### 3.3 Analyzer Service

A **Flask** application responsible for code analysis.  
It scans source code to extract an Abstract Syntax Tree (AST) and stores relationships in Neo4j.

Main endpoints:

- `POST /api/analyze` → start code analysis  
- `GET /api/health` → health check  

Behavior:

- Runs analysis in background threads (non-blocking)  
- Sends progress updates via WebSocket (`analysis.progress`)  
- On completion, writes graph data to Neo4j via its API  
- May emit final completion events (`analysis.complete`)  

Possible extensions:

- Integrate with LLM (Ollama) for summarization or insights  
- Generate structured metadata or reports  

---

### 3.4 Neo4j Graph Service

A **Flask API** providing query access to the code knowledge graph stored in Neo4j.

Responsibilities:

- Expose REST endpoints for node and relationship queries  
- Serve data for graph visualizations in the frontend  

Common endpoints:

- `GET /api/graph/nodes` → list nodes (optionally filtered by type or name)  
- `GET /api/graph/node/{id}` → get node details  
- `GET /api/graph/edges` → list relationships  
- `POST /api/graph/bulk` → bulk insert (used by Analyzer)  

Data model:

- **Node types:** Folder, File, Class, Function, Variable  
- **Relationships:** CONTAINS, CALLS, IMPORTS, etc.  

The frontend uses these APIs via message actions like `graph.nodes.list`.  

Performance considerations:

- Add indexes on node names and IDs  
- Cache frequent queries if needed  
- Return paginated results for large graphs  

---

### 3.5 WebSocket Notification Service

A **Python asyncio** service handling WebSocket connections with clients.  

Responsibilities:

- Maintain persistent WebSocket connections  
- Broadcast JSON events (`a` + `p`) to connected clients  
- Accept internal messages from backend services and forward them  

The service currently handles analysis progress updates but should be extended to support all event types.

Authentication:

- Currently uses API key in query parameter  
- Should be upgraded to validate JWT tokens for per-user access  

Possible architecture evolutions:

1. Continue using a centralized WS broadcaster (preferred for simplicity).  
2. Replace with direct WS implementation in the gateway (if using FastAPI/NestJS).

---

### 3.6 Workflow Integration (n8n)

The platform integrates **n8n** for workflow automation.  
The backend acts as a proxy between the frontend and n8n’s REST API.

Capabilities:

- List available workflows (`workflow.list`)  
- Trigger workflow executions (`workflow.run`)  
- Return status and output to frontend  

The gateway authenticates internally to n8n using stored credentials and hides these from the frontend.

---

### 3.7 Git Integration (Gitea)

Gitea provides a self-hosted Git server for managing project repositories.

Possible backend features:

- Create new repositories for analyzed projects  
- Commit or retrieve files  
- Integrate with user credentials  

This integration is optional but can later enable version control features within the UI.

---

### 3.8 File Storage and Event Handling (MinIO + RabbitMQ)

MinIO serves as object storage; RabbitMQ distributes file events.

Flow:

1. User uploads project files (directly or via backend-provided presigned URL).  
2. MinIO emits a file event (`file.put`) to RabbitMQ.  
3. Analyzer or File Processor service consumes this event.  
4. Analyzer runs automatically on the uploaded files.  
5. WebSocket notifications update the frontend.  

This event-driven pipeline enables efficient decoupled file handling and automatic analysis.

---

### 3.9 AI Integration (Ollama + OpenWebUI)

Context Machine includes local LLM services (Ollama runtime and OpenWebUI interface).

Potential backend use cases:

- Generate business plans or feature ideas (`idea.generate`)  
- Summarize or explain analyzed code (`ai.summarize`)  
- Enable chat-based code review (`chat.ask`)  

The backend can call Ollama’s local API or OpenWebUI’s OpenAI-compatible endpoint.  

Responses can be streamed through the existing WebSocket channel, allowing live token updates in the frontend.

---

## 4. Data Models and Persistence

### 4.1 Graph Data (Neo4j)

Stored as labeled property graphs:

| Entity Type | Description |
|--------------|-------------|
| Folder | Represents directory structure |
| File | Represents source file |
| Class | Represents class definition |
| Function | Represents function or method |
| Variable | Represents symbols |

Relationships define containment, dependencies, or usage links.  
Example: `FOLDER` → `CONTAINS` → `FILE` → `CONTAINS` → `FUNCTION`.

---

### 4.2 User Data

Depending on chosen auth implementation:

- **Keycloak:** user info and roles in Keycloak DB  
- **Custom Auth:** separate DB table for users, preferences, and roles  

User preferences may include:

~~~
{
  "theme": "dark",
  "language": "en",
  "layout": { "leftSidebarWidth": 250 },
  "lastProject": "my-app"
}
~~~

---

### 4.3 Permissions and Feature Flags

Permissions define feature access levels and can be loaded dynamically:

~~~
[
  { "name": "VIEW_RESULTS", "default": true },
  { "name": "RUN_ANALYSIS", "default": true },
  { "name": "ADMIN", "default": false }
]
~~~

Feature flags may also be part of module manifests to toggle optional capabilities.

---

### 4.4 Workflow and AI Data

- **Workflows:** managed within n8n (no additional persistence needed)  
- **AI sessions:** can be stateless or stored temporarily for conversation continuity  

---

### 4.5 Storage Summary

| Data Type | Storage |
|------------|----------|
| Code Graph | Neo4j |
| User Auth | Keycloak or custom DB |
| Preferences | SQL or JSON |
| Workflows | n8n internal |
| Files | MinIO |
| Events | RabbitMQ |
| Logs | stdout or ELK stack (optional) |

---

## 5. Development Practices and Framework Recommendations

### 5.1 Modular Service Design

Mirror the frontend’s modularity on the backend.  
Each microservice should have a single responsibility, clear message contracts, and independent deployment configuration.

Example:

- Analyzer Service → Code Parsing  
- Graph Service → Graph Querying  
- Auth Service → User Management  
- Gateway → Message Routing  
- WS Service → Event Delivery  

This structure allows independent testing and scaling.

---

### 5.2 Implementing the Gateway

Recommended frameworks:

- **Python FastAPI:** modern, async, integrates HTTP + WebSocket + Pydantic validation  
- **Node.js / NestJS:** TypeScript alignment with frontend, modular decorators, WS and RabbitMQ integration  

Responsibilities:

- Handle `/api/message` POST endpoint  
- Maintain or connect to WebSocket broadcaster  
- Route messages to services (Analyzer, Graph, etc.)  
- Authenticate requests  
- Log and monitor requests and responses  

---

### 5.3 Real-Time Event Handling

Continue using the simple JSON message schema (`a` + `p`).  
Ensure all backend-emitted events conform to this schema for consistency.

Possible improvements:

- Introduce message validation via JSON Schema  
- Optionally adopt STOMP or Socket.IO for advanced routing  
- Maintain a registry of all action names and expected payload structures  

---

### 5.4 REST Documentation and Validation

All REST endpoints (e.g., Analyzer, Graph) should expose **OpenAPI/Swagger** documentation.  
This makes it easy to test and onboard developers.

Example:  
`http://localhost:3001/apidocs` (for Neo4j service)

---

### 5.5 Authentication and Security

- Prefer OAuth2 / Keycloak for full identity management  
- Use JWT tokens for session validation in both HTTP and WebSocket  
- Protect all internal APIs (Analyzer, Neo4j) with API keys or internal network restrictions  
- Enforce HTTPS and WSS in production  
- Log authentication events and failed attempts  

Example Authorization header:

~~~
Authorization: Bearer <token>
~~~

---

### 5.6 Message Queue and Async Tasks

RabbitMQ can handle background jobs and decouple long-running operations.

Example usage:

- Gateway publishes job → `analysis.start`  
- Analyzer consumes and executes  
- Analyzer sends progress → WebSocket  

This model allows parallel task execution and reliable job management.

---

### 5.7 Framework and Tooling Stack

| Component | Recommended Technology |
|------------|------------------------|
| API Gateway | FastAPI / NestJS |
| Analyzer | Flask (existing) |
| Graph API | Flask (existing) |
| Auth | Keycloak / FastAPI JWT |
| WebSocket | Python asyncio / integrated gateway |
| Queue | RabbitMQ |
| Object Storage | MinIO |
| Database | Neo4j + optional SQL (Postgres/SQLite) |
| AI Integration | Ollama + OpenWebUI API |

---

### 5.8 Developer Workflow

1. Clone the repository and start Docker Compose (`docker compose up`).  
2. Access the frontend dev server on port 8080.  
3. Backend services run on various ports:
   - Analyzer: 3000  
   - Neo4j API: 3001  
   - WebSocket: 3010  
4. Frontend proxies `/api` and `/ws` to these services.  
5. Modify manifests or modules under `services/frontend/src`.  

When adding new actions or services:

- Define a clear action name (e.g., `workflow.execute`)  
- Implement backend handler in the appropriate service  
- Add frontend handler or store update logic  
- Ensure message formats align  

---

### 5.9 Testing and Logging

- Unit test message handling at both frontend and backend levels.  
- Add correlation IDs in message payloads for traceability.  
- Maintain health endpoints for all services (`/api/health`).  
- Log events with structured format (`timestamp`, `action`, `user`, `status`).  

---

### 5.10 Scalability and Performance

Although currently single-user focused, the system can scale by:

- Running multiple Analyzer or Graph instances behind the gateway  
- Using RabbitMQ for distributed job queues  
- Caching frequent queries in Redis  
- Partitioning Neo4j graphs per project or user  

Front-end performance remains optimal because of lazy loading and event-driven updates.

---

### 5.11 Monitoring and Observability

Add container health checks and metrics:

- Health routes in each microservice  
- Prometheus exporters or logs for resource usage  
- Alerts for failed analyses or service restarts  

Integrate with Docker Compose healthcheck feature for automatic restart.

---

### 5.12 Development Alignment

Maintain strong coordination between frontend and backend development:

- Version-control message schema changes together  
- Document all action names and payloads in a shared spec file  
- Use JSON Schema validation both client and server side  
- Keep frontend type definitions synchronized with backend response models  

---

## 6. Summary

Context Machine is designed as a **modular, event-driven architecture** where the frontend is dynamically composed from data received from the backend.  
This makes the system flexible and extensible while maintaining a clear separation of responsibilities.

The frontend:

- Defines no hardcoded routes or layouts.  
- Discovers its structure from JSON manifests.  
- Communicates with backend through unified message and event channels.  
- Updates the UI reactively in response to WebSocket events.  

The backend:

- Consists of modular microservices (Analyzer, Graph, WS, etc.).  
- Exposes a single unified messaging endpoint via Gateway.  
- Streams asynchronous updates to the frontend in real time.  
- Integrates supporting systems like n8n, Gitea, and Ollama.  

Together, this architecture enables a highly flexible and intelligent environment for code analysis, visualization, and automation.

---

## 7. Quick Reference

| Area | Technology | Purpose |
|-------|-------------|----------|
| Frontend | Vue 3 + TypeScript | Dynamic SPA |
| State | Pinia | Centralized store |
| Routing | Vue Router | Navigation |
| Messaging | HTTP + WebSocket | Unified API |
| Backend Gateway | FastAPI / NestJS | Message routing |
| Analyzer | Flask (Python) | Code analysis |
| Graph | Neo4j + Flask API | Code graph storage/query |
| Realtime | WebSocket (Python) | Event push |
| Auth | Keycloak / JWT | User management |
| Queue | RabbitMQ | Async tasks |
| Storage | MinIO | File handling |
| AI | Ollama / OpenWebUI | LLM integration |

---

### Final Notes

The Context Machine’s architectural philosophy is **data-driven modularity**.  
Developers working on the frontend should focus on maintaining strict schema consistency with backend message formats, leveraging manifests for flexibility, and keeping UI logic reactive rather than procedural.

All communication with the backend is mediated through the unified messaging interface.  
Understanding and adhering to this protocol is essential for developing new features or debugging integrations.

This document should provide a complete foundation for new developers to understand how the frontend operates, how it interacts with backend services, and how to extend the platform safely and effectively.


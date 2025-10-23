# Context Machine - Next Development Phase

## 🚨 MANDATORY: Read These Files First! 🚨

**Before working on ANY task, you MUST read and understand these files:**

### Core Architecture Files (REQUIRED READING):
1. **`services/frontend/README.md`** - Complete frontend architecture, Vue 3 + dynamic UI system
2. **`services/backend/README.md`** - Backend API Gateway architecture and message routing  
3. **`docker-compose.yml`** - All services and their configuration
4. **`Makefile`** - Available commands (`make up`, `make build`, `make down`)

### Infrastructure Scripts (REQUIRED READING):
5. **`infra/scripts/make/up.sh`** - How services are started
6. **`infra/scripts/make/build.sh`** - How containers are built  
7. **`infra/scripts/utils/container-utils.sh`** - Container build logic
8. **`infra/scripts/utils/usage.sh`** - Service URLs and access info


### Current System Status:
- **Backend**: ✅ FULLY FUNCTIONAL (login, register, message routing, database)
- **Frontend**: ❓ EXISTS but needs integration with new backend
- **Database**: ✅ PostgreSQL with complete schema
- **Docker**: ✅ All services containerized with hot-reload

## What We're Building

**Context Machine** is a dynamic, data-driven platform where:

1. **Frontend (Vue 3)** - Completely dynamic UI that configures itself from backend data
   - No hardcoded routes or components
   - Pages, modules, widgets loaded from database
   - Message-based communication with backend

2. **Backend (Flask)** - Lightweight API Gateway that:
   - Provides JWT authentication with complete frontend config
   - Routes messages to specialized services
   - Manages multi-tenant database with subscriptions/permissions
   - Publishes real-time events via WebSocket

3. **Multi-Tenant Architecture** - Subscription-based access control:
   - SuperAdmin → Partner → Tenant → Project hierarchy
   - Groups contain pages + permissions
   - Users get access via active subscriptions
   - Dynamic frontend based on user's subscription level

## Current Backend Status: ✅ COMPLETE

**Backend is 100% functional with:**
- ✅ JWT Authentication (admin/admin123, registration works)
- ✅ Database Integration (PostgreSQL with full schema)
- ✅ Message Routing (discovery, chat, dashboard, navigation actions)
- ✅ Frontend Config Delivery (modules, pages, widgets from DB)
- ✅ Docker Integration (hot-reload, health checks)
- ✅ Swagger API Docs (http://localhost:3006/apidocs)

**Test Commands:**
```bash
# Start system
make up

# Test login
curl -X POST http://localhost:3006/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# View Swagger
open http://localhost:3006/apidocs
```

## Next Development Tasks

### 1. Frontend Integration (HIGH PRIORITY)
**Goal**: Connect existing Vue 3 frontend to new backend

- [x] **Analyze current frontend structure** - Understand existing Vue 3 app
- [x] **Update frontend API calls** - Point to http://localhost:3006 instead of old endpoints
- [x] **Implement JWT token handling** - Store and use tokens from login response
- [ ] **Consume dynamic config** - Use modules/pages/widgets from auth response
- [ ] **Test login flow** - Ensure frontend can authenticate with backend
- [ ] **Update WebSocket connection** - Connect to existing WebSocket service for real-time updates

### 2. Permission-Based Access Control
**Goal**: Filter frontend content based on user permissions/subscriptions

- [ ] **Implement subscription system** - Users get access via active subscriptions
- [ ] **Filter pages by permissions** - Only show pages user has access to
- [ ] **Filter modules by subscriptions** - Only load modules from active subscriptions
- [ ] **Dynamic navigation** - Generate menu based on accessible pages
- [ ] **Permission middleware** - Check permissions for all message actions

### 3. User Management Interface
**Goal**: Admin interface for managing users, groups, subscriptions

- [ ] **User CRUD operations** - Create, read, update, delete users
- [ ] **Group management** - Assign pages + permissions to groups
- [ ] **Subscription management** - Create subscriptions, assign to users
- [ ] **Admin dashboard** - Interface for managing the multi-tenant system

### 4. Enhanced Security & Validation
**Goal**: Production-ready security measures

- [ ] **Input validation** - Validate all API inputs with proper error messages
- [ ] **Error handling** - Consistent error responses without exposing internals
- [ ] **Rate limiting** - Prevent API abuse (optional)
- [ ] **HTTPS support** - SSL certificates for production (optional)

## Key Technical Details

### Message Protocol (Already Implemented)
**Format**: `{"a": "action", "p": {...payload}}`

**Available Actions:**
- `discovery.module.list` - Get available modules
- `discovery.page.list` - Get available pages  
- `discovery.widget.list` - Get widget registry
- `dashboard.stats.get` - Get dashboard statistics
- `navigation.menu.get` - Get navigation menu
- `chat.send` - Send chat message (echo response)
- `user.profile.get` - Get user profile

### Database Schema (Multi-Tenant)
```
SuperAdmin → Partner → Tenant → Project
                                   ├── Pages (routes like "/", "/dashboard")
                                   ├── Modules (features like "navigation", "chat")
                                   ├── Widgets (UI components)
                                   ├── Groups (pages + permissions)
                                   ├── Subscriptions (pricing tiers)
                                   └── Users (with group assignments)
```

### Frontend Architecture (Vue 3)
- **Dynamic Routes** - Generated from database pages
- **Dynamic Components** - Loaded from widget registry
- **Message-Based** - All backend communication via `/api/message`
- **Real-time** - WebSocket events for live updates

## Development Commands

```bash
# Start entire system
make up

# Build containers (with --no-cache)
make build

# Stop system
make down

# View service URLs and credentials
./infra/scripts/utils/usage.sh

# Check backend logs
docker logs context-machine-backend

# Access services
# Backend API: http://localhost:3006/apidocs
# Frontend: http://localhost:8080 (if running)
# PostgreSQL: localhost:5432 (postgres/postgres)
```

## Success Criteria

**Phase 1 Complete When:**
- [x] Frontend can login with backend (admin/admin123)
- [ ] Frontend displays dynamic pages from database
- [ ] Frontend shows modules based on user permissions
- [ ] Message routing works end-to-end
- [ ] WebSocket real-time updates functional

**Phase 2 Complete When:**
- [ ] Subscription system controls access
- [ ] Admin can manage users/groups/subscriptions
- [ ] Permission-based filtering works
- [ ] Multi-tenant hierarchy functional

## Important Notes

- **NO hardcoded frontend content** - Pages, modules, navigation must come from database
- **Widget Storage Strategy** - Widgets will be stored in organized widget folders (many widgets expected)
- **NO direct service calls** - All communication via message protocol
- **NO skipping file reading** - Understanding existing architecture is mandatory
- **Focus on integration first** - Get basic login working before advanced features

## Widget Organization Strategy

**Challenge**: We'll have many widgets, need clean storage solution

**Current Database Approach**:
- Widget path stored as `./components/TopBar.vue`
- Widget registry provides component paths to frontend
- Frontend dynamically imports widgets based on database paths

**Future Considerations**:
- Organize widgets by module: `./widgets/navigation/TopBar.vue`
- Category-based folders: `./widgets/forms/`, `./widgets/charts/`, `./widgets/layout/`
- Versioned widgets: `./widgets/navigation/v1/TopBar.vue`
- Widget packages: Each module could have its own widget package/bundle
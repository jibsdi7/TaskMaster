# TaskMaster - System Architecture

## 🏗️ Overview

TaskMaster is a production-ready User Journey Recorder and Workflow Automation Platform built with modern technologies and best practices.

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  React + TypeScript + Vite + Material-UI + React Flow       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         API Gateway                          │
│              FastAPI + CORS + Authentication                 │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │Workflows │  │ Recorder │  │  Blocks  │
        │   API    │  │   API    │  │   API    │
        └──────────┘  └──────────┘  └──────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │Workflow  │  │ Recorder │  │  Script  │
        │ Engine   │  │ Service  │  │Generator │
        └──────────┘  └──────────┘  └──────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │PostgreSQL│  │  Redis   │  │Playwright│
        │ Database │  │  Cache   │  │ Browser  │
        └──────────┘  └──────────┘  └──────────┘
```

---

## 📦 Technology Stack

### Backend
- **Framework**: FastAPI 0.109.0
- **Language**: Python 3.12
- **ORM**: SQLAlchemy 2.0.25
- **Database**: PostgreSQL 14+
- **Cache**: Redis 5.0.1
- **Task Queue**: Celery 5.3.6
- **Browser Automation**: Playwright 1.41.0
- **Authentication**: JWT (python-jose)
- **Password Hashing**: bcrypt (passlib)

### Frontend
- **Framework**: React 18.3.1
- **Language**: TypeScript 5.6.2
- **Build Tool**: Vite 5.4.21
- **UI Library**: Material-UI 6.3.0
- **State Management**: Zustand 5.0.2
- **Workflow Canvas**: React Flow 11.11.4
- **HTTP Client**: Axios 1.7.9
- **Routing**: React Router 7.1.1

### DevOps
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Testing**: Pytest, Jest, React Testing Library
- **Code Quality**: Black, Flake8, ESLint, Prettier

---

## 🗂️ Project Structure

```
TaskMaster/
├── backend/
│   ├── app/
│   │   ├── api/              # API endpoints
│   │   │   ├── auth.py       # Authentication endpoints
│   │   │   ├── workflows.py  # Workflow CRUD
│   │   │   ├── recorder.py   # Recording endpoints
│   │   │   ├── blocks.py     # Reusable blocks
│   │   │   └── executions.py # Execution management
│   │   ├── core/             # Core functionality
│   │   │   ├── config.py     # Configuration
│   │   │   └── security.py   # Auth & security
│   │   ├── db/               # Database layer
│   │   │   ├── database.py   # DB connection
│   │   │   └── models.py     # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   │   ├── user.py
│   │   │   ├── workflow.py
│   │   │   └── block.py
│   │   ├── services/         # Business logic
│   │   │   ├── recorder.py   # Playwright recorder
│   │   │   ├── workflow_executor.py  # DAG execution
│   │   │   └── script_generator.py   # Code generation
│   │   └── main.py           # Application entry
│   ├── tests/                # Backend tests
│   ├── alembic/              # Database migrations
│   ├── requirements.txt      # Python dependencies
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── Layout.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── pages/            # Page components
│   │   │   ├── Login.tsx
│   │   │   ├── WorkflowList.tsx
│   │   │   ├── WorkflowEditor.tsx
│   │   │   └── ExecutionList.tsx
│   │   ├── flows/            # React Flow components
│   │   │   ├── WorkflowCanvas.tsx
│   │   │   └── nodes/        # Custom node types
│   │   ├── services/         # API services
│   │   │   └── api.ts
│   │   ├── store/            # Zustand stores
│   │   │   └── authStore.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .github/
│   └── workflows/
│       └── ci.yml
├── README.md
├── ARCHITECTURE.md
└── DEPLOYMENT.md
```

---

## 🔄 Data Flow

### 1. User Journey Recording

```
User Action → Browser → Playwright Codegen → Parse Script → 
Create Workflow Nodes → Store in Database → Display in Canvas
```

**Implementation:**
- Uses `playwright codegen` subprocess
- Captures browser actions in real-time
- Parses generated script into structured nodes
- Stores with selectors, values, and metadata

### 2. Workflow Execution

```
User Triggers → Load Workflow → Build DAG → Topological Sort → 
Execute Nodes → Capture Screenshots → Store Logs → Return Results
```

**Implementation:**
- DAG-based execution engine
- Async Playwright execution
- Retry logic for failed nodes
- Screenshot capture at each step
- Comprehensive logging

### 3. Reusable Blocks

```
Create Workflow → Save as Block → Version Control → 
Drag into New Workflow → Execute as Subgraph
```

**Implementation:**
- Blocks are versioned workflows
- Support input/output parameters
- Can be nested in other workflows
- Maintain execution context

---

## 🗄️ Database Schema

### Core Tables

#### users
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);
```

#### workflows
```sql
CREATE TABLE workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_id INTEGER REFERENCES projects(id),
    user_id INTEGER REFERENCES users(id),
    meta_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);
```

#### workflow_nodes
```sql
CREATE TABLE workflow_nodes (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES workflows(id),
    node_id VARCHAR(100) NOT NULL,
    node_type VARCHAR(50) NOT NULL,
    action VARCHAR(100),
    selector TEXT,
    value TEXT,
    position_x FLOAT,
    position_y FLOAT,
    config JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### workflow_edges
```sql
CREATE TABLE workflow_edges (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES workflows(id),
    source_node_id VARCHAR(100) NOT NULL,
    target_node_id VARCHAR(100) NOT NULL,
    edge_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### workflow_runs
```sql
CREATE TABLE workflow_runs (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES workflows(id),
    user_id INTEGER REFERENCES users(id),
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    meta_data JSONB
);
```

#### blocks
```sql
CREATE TABLE blocks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    workflow_id INTEGER REFERENCES workflows(id),
    user_id INTEGER REFERENCES users(id),
    version INTEGER DEFAULT 1,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔐 Security Architecture

### Authentication Flow

```
1. User Login → Validate Credentials → Generate JWT Tokens
2. Access Token (30 min) + Refresh Token (7 days)
3. Store tokens in localStorage (frontend)
4. Include Access Token in API requests
5. Refresh when expired
```

### Authorization

- **Role-Based Access Control (RBAC)**
  - Admin: Full system access
  - Developer: Create/edit workflows
  - Viewer: Read-only access

### Security Measures

1. **Password Security**
   - bcrypt hashing with salt
   - Minimum 8 characters
   - Complexity requirements

2. **API Security**
   - JWT token validation
   - CORS configuration
   - Rate limiting (planned)
   - Input validation (Pydantic)

3. **Database Security**
   - Parameterized queries (SQLAlchemy)
   - Connection pooling
   - SSL connections (production)

---

## 🎯 Workflow Engine

### DAG Execution Model

```python
class WorkflowExecutor:
    def execute(self, workflow):
        # 1. Build DAG from nodes and edges
        dag = self.build_dag(workflow)
        
        # 2. Topological sort for execution order
        execution_order = self.topological_sort(dag)
        
        # 3. Execute nodes sequentially
        for node in execution_order:
            result = await self.execute_node(node)
            
            # 4. Handle branching
            if node.type == "condition":
                next_nodes = self.evaluate_condition(node, result)
            
            # 5. Capture screenshots
            screenshot = await self.capture_screenshot()
            
            # 6. Store logs
            self.log_execution(node, result, screenshot)
```

### Node Types

1. **Browser Actions**
   - Click, Type, Select, Hover
   - Upload File, Download File
   - Wait for Element

2. **Navigation**
   - Open URL, Go Back, Refresh
   - Navigate to Page

3. **Control Flow**
   - Delay, If Condition, Loop
   - Try-Catch, Parallel

4. **Data Operations**
   - Variable Assignment
   - API Request
   - Data Transformation

5. **Reusable Blocks**
   - Nested workflow execution
   - Parameter passing
   - Context sharing

---

## 🚀 Performance Optimization

### Backend

1. **Database**
   - Connection pooling (SQLAlchemy)
   - Query optimization with indexes
   - Lazy loading for relationships

2. **Caching**
   - Redis for session storage
   - Cache frequently accessed workflows
   - Cache user permissions

3. **Async Operations**
   - FastAPI async endpoints
   - Async Playwright execution
   - Celery for background tasks

### Frontend

1. **Code Splitting**
   - Route-based splitting
   - Lazy loading components
   - Dynamic imports

2. **State Management**
   - Zustand for minimal re-renders
   - Memoization with useMemo
   - Virtual scrolling for large lists

3. **Build Optimization**
   - Vite for fast builds
   - Tree shaking
   - Asset optimization

---

## 📊 Monitoring & Observability

### Logging

- **Structured Logging**: JSON format
- **Log Levels**: DEBUG, INFO, WARNING, ERROR, CRITICAL
- **Log Storage**: File-based + centralized (planned)

### Metrics

- **Application Metrics**
  - Request count and latency
  - Error rates
  - Active users

- **Workflow Metrics**
  - Execution time
  - Success/failure rates
  - Node-level performance

### Health Checks

- `/health` endpoint
- Database connectivity
- Redis connectivity
- Celery worker status

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
1. Code Push/PR
   ↓
2. Run Linters (Black, Flake8, ESLint)
   ↓
3. Run Tests (Pytest, Jest)
   ↓
4. Build Docker Images
   ↓
5. Push to Registry (on main branch)
   ↓
6. Deploy to Staging (automatic)
   ↓
7. Deploy to Production (manual approval)
```

---

## 🧪 Testing Strategy

### Backend Tests

1. **Unit Tests**
   - Service layer logic
   - Utility functions
   - Data transformations

2. **Integration Tests**
   - API endpoints
   - Database operations
   - External service mocks

3. **E2E Tests**
   - Complete workflow execution
   - User authentication flow
   - Recording and playback

### Frontend Tests

1. **Component Tests**
   - React Testing Library
   - User interactions
   - State changes

2. **Integration Tests**
   - API integration
   - Routing
   - Form submissions

---

## 🔮 Future Enhancements

1. **Advanced Features**
   - AI-powered test generation
   - Visual regression testing
   - Cross-browser support
   - Mobile app recording

2. **Scalability**
   - Kubernetes deployment
   - Horizontal scaling
   - Load balancing
   - CDN integration

3. **Integrations**
   - CI/CD tool plugins
   - Slack/Teams notifications
   - Jira integration
   - GitHub Actions integration

---

**Version:** 1.0.0  
**Last Updated:** 2026-06-16  
**Maintained By:** TaskMaster Team
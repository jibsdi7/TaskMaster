# TaskMaster - User Journey Recorder & Workflow Automation Platform

A production-ready platform for recording UI journeys, creating reusable workflow blocks, and automating web interactions using Playwright.

## 🚀 Features

- **UI Journey Recording**: Record user interactions from any web application
- **Visual Workflow Builder**: Drag-and-drop interface powered by React Flow
- **Reusable Blocks**: Save workflows as reusable components with versioning
- **Workflow Execution**: DAG-based execution engine with async support
- **Screenshot Capture**: Automatic screenshots for each workflow step
- **Playwright Export**: Generate executable Playwright scripts (Python/JS/TS)
- **Real-time Monitoring**: Execution logs, error tracking, and performance metrics
- **Authentication**: JWT-based auth with role-based access control

## 🏗️ Architecture

### Backend Stack
- **Framework**: FastAPI (Python 3.12)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Cache**: Redis
- **Task Queue**: Celery
- **Automation**: Playwright
- **API Docs**: OpenAPI/Swagger

### Frontend Stack
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **Workflow Canvas**: React Flow
- **State Management**: Zustand
- **HTTP Client**: Axios

## 📦 Installation

### Prerequisites
- Python 3.12+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Docker Setup

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🎯 Quick Start

1. **Start the application**:
   - Backend: `http://localhost:8000`
   - Frontend: `http://localhost:5173`
   - API Docs: `http://localhost:8000/docs`

2. **Create your first workflow**:
   - Click "New" to create a workflow
   - Click "Record" to start recording UI interactions
   - Perform actions in your target web application
   - Click "Stop Recording" to finish
   - Save your workflow

3. **Build complex workflows**:
   - Drag nodes from the left panel to the canvas
   - Connect nodes to define execution flow
   - Configure each node in the right panel
   - Save as a reusable block

4. **Execute workflows**:
   - Click "Run Workflow" to execute
   - Monitor execution in real-time
   - View logs and screenshots
   - Export as Playwright script

## 📚 API Documentation

### Authentication
```bash
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
GET  /api/auth/me
```

### Workflows
```bash
POST   /api/workflows
GET    /api/workflows
GET    /api/workflows/{id}
PUT    /api/workflows/{id}
DELETE /api/workflows/{id}
POST   /api/workflows/{id}/run
GET    /api/workflows/{id}/export
```

### Recorder
```bash
POST /api/recorder/start
POST /api/recorder/stop
GET  /api/recorder/status
```

### Blocks
```bash
POST   /api/blocks
GET    /api/blocks
GET    /api/blocks/{id}
PUT    /api/blocks/{id}
DELETE /api/blocks/{id}
GET    /api/blocks/{id}/versions
```

### Executions
```bash
GET /api/executions
GET /api/executions/{id}
GET /api/executions/{id}/logs
GET /api/executions/{id}/screenshots
```

## 🗄️ Database Schema

### Core Tables
- `users` - User accounts and authentication
- `projects` - Project organization
- `workflows` - Workflow definitions
- `workflow_nodes` - Individual workflow steps
- `workflow_edges` - Node connections
- `workflow_runs` - Execution history
- `workflow_logs` - Execution logs
- `blocks` - Reusable workflow blocks
- `block_versions` - Block version history

## 🔧 Configuration

### Environment Variables

**Backend (.env)**:
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/taskmaster
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-here
PLAYWRIGHT_HEADLESS=false
```

**Frontend (.env)**:
```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/ -v --cov=app
```

### Frontend Tests
```bash
cd frontend
npm run test
npm run test:coverage
```

### E2E Tests
```bash
npm run test:e2e
```

## 📊 Monitoring

- **Celery Flower**: `http://localhost:5555`
- **API Metrics**: `http://localhost:8000/metrics`
- **Health Check**: `http://localhost:8000/health`

## 🚢 Deployment

### Production Build

**Backend**:
```bash
docker build -t taskmaster-backend:latest ./backend
docker push taskmaster-backend:latest
```

**Frontend**:
```bash
cd frontend
npm run build
docker build -t taskmaster-frontend:latest .
docker push taskmaster-frontend:latest
```

### Kubernetes Deployment
```bash
kubectl apply -f k8s/
```

## 🔐 Security

- JWT-based authentication
- Role-based access control (Admin, Developer, Viewer)
- Password hashing with bcrypt
- CORS protection
- Rate limiting
- Input validation
- SQL injection prevention

## 📈 Performance

- Async/await for non-blocking operations
- Redis caching for frequently accessed data
- Database connection pooling
- Celery for background task processing
- Optimized React rendering with memoization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- FastAPI for the excellent web framework
- React Flow for the workflow canvas
- Playwright for browser automation
- Material-UI for the component library

## 📞 Support

- Documentation: [docs.taskmaster.io](https://docs.taskmaster.io)
- Issues: [GitHub Issues](https://github.com/yourusername/taskmaster/issues)
- Email: support@taskmaster.io

---

**Made with ❤️ by the TaskMaster Team**
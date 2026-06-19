# TaskMaster - Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- PostgreSQL 14+ (optional for development)
- Docker & Docker Compose (for production)

### Development Setup

#### 1. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium

# Start the server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Backend will be available at:** `http://localhost:8000`
**API Documentation:** `http://localhost:8000/docs`

#### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Frontend will be available at:** `http://localhost:5173`

---

## 🐳 Docker Deployment

### Using Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Services

- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`
- **Backend API**: `http://localhost:8000`
- **Frontend**: `http://localhost:3000`
- **Celery Flower**: `http://localhost:5555`

---

## 📊 Database Setup

### PostgreSQL Configuration

1. **Install PostgreSQL**
   ```bash
   # Windows (using Chocolatey)
   choco install postgresql

   # macOS
   brew install postgresql

   # Linux
   sudo apt-get install postgresql
   ```

2. **Create Database**
   ```sql
   CREATE DATABASE taskmaster;
   CREATE USER taskmaster_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE taskmaster TO taskmaster_user;
   ```

3. **Update Environment Variables**
   ```bash
   # backend/.env
   DATABASE_URL=postgresql://taskmaster_user:your_password@localhost:5432/taskmaster
   ```

4. **Run Migrations**
   ```bash
   cd backend
   alembic upgrade head
   ```

---

## 🔧 Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/taskmaster

# Redis
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8000
```

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest
pytest --cov=app tests/
```

### Frontend Tests

```bash
cd frontend
npm test
npm run test:coverage
```

---

## 📦 Production Build

### Backend

```bash
cd backend
pip install -r requirements.txt
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Frontend

```bash
cd frontend
npm run build
npm run preview
```

---

## 🔐 Security Considerations

1. **Change Default Credentials**
   - Update `SECRET_KEY` in backend/.env
   - Use strong database passwords

2. **Enable HTTPS**
   - Use reverse proxy (Nginx/Traefik)
   - Configure SSL certificates

3. **Database Security**
   - Enable SSL for PostgreSQL connections
   - Restrict database access by IP

4. **API Rate Limiting**
   - Configure rate limits in production
   - Use API gateway if needed

---

## 📈 Monitoring

### Celery Flower Dashboard

Access at `http://localhost:5555` to monitor:
- Task execution
- Worker status
- Task history
- Performance metrics

### Application Logs

```bash
# Backend logs
docker-compose logs -f backend

# Celery logs
docker-compose logs -f celery-worker

# Frontend logs
docker-compose logs -f frontend
```

---

## 🔄 CI/CD Pipeline

The project includes GitHub Actions workflows:

- **CI Pipeline** (`.github/workflows/ci.yml`)
  - Runs on every push/PR
  - Executes tests
  - Builds Docker images
  - Checks code quality

### Manual Deployment

```bash
# Build images
docker-compose build

# Push to registry
docker-compose push

# Deploy to server
ssh user@server 'cd /app && docker-compose pull && docker-compose up -d'
```

---

## 🐛 Troubleshooting

### Backend Won't Start

1. **Check PostgreSQL Connection**
   ```bash
   psql -h localhost -U taskmaster_user -d taskmaster
   ```

2. **Verify Python Dependencies**
   ```bash
   pip list | grep fastapi
   ```

3. **Check Port Availability**
   ```bash
   netstat -an | findstr :8000
   ```

### Frontend Build Errors

1. **Clear Node Modules**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check Node Version**
   ```bash
   node --version  # Should be 18+
   ```

### Database Migration Issues

```bash
# Reset migrations
alembic downgrade base
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"
```

---

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

## 🆘 Support

For issues and questions:
1. Check the [GitHub Issues](https://github.com/yourusername/taskmaster/issues)
2. Review the API documentation at `/docs`
3. Check application logs for error details

---

**Last Updated:** 2026-06-16
**Version:** 1.0.0
# Docker Guide — TaskMaster

This document explains every Docker file in the project, what each instruction does, and how the full stack comes together with a single command.

---

## Project Structure

```
TaskMaster/
├── backend/
│   └── Dockerfile          ← Python / FastAPI / Playwright image
├── frontend/
│   └── Dockerfile          ← Node.js / Vite / React image
└── docker-compose.yml      ← Orchestrates all 5 services together
```

---

## 1. `backend/Dockerfile`

```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libdbus-1-3 libxkbcommon0 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libasound2 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium

COPY . .

RUN mkdir -p /app/uploads /app/screenshots

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Line-by-line explanation

| Instruction | What it does | Why it matters |
|---|---|---|
| `FROM python:3.12-slim` | Uses Debian Linux + Python 3.12, minimal variant as the base OS | Keeps the image ~130 MB instead of ~900 MB for the full variant |
| `WORKDIR /app` | Sets `/app` as the working directory for all subsequent commands | All `COPY`, `RUN`, `CMD` instructions run relative to this path |
| First `apt-get` block | Installs `gcc` (C compiler) and `postgresql-client` | `gcc` is needed to compile certain Python packages; `postgresql-client` allows DB connectivity checks |
| Second `apt-get` block (15 libraries) | Installs Chromium's native system dependencies | Playwright's bundled Chromium **will not launch** without these Linux graphics/audio/network libraries |
| `COPY requirements.txt .` | Copies only the requirements file first | Allows Docker to **cache** the pip install layer — it only re-runs when `requirements.txt` changes, not on every code edit |
| `pip install --no-cache-dir -r requirements.txt` | Installs FastAPI, SQLAlchemy, Playwright Python SDK, Uvicorn, etc. | `--no-cache-dir` avoids storing the pip download cache inside the image |
| `playwright install chromium` | Downloads Playwright's own Chromium browser binary | Playwright ships its own browser (not the system one) to guarantee compatibility |
| `COPY . .` | Copies all application source code into the image | Done **after** dependency install so code changes don't invalidate the expensive pip/playwright layers |
| `mkdir -p /app/uploads /app/screenshots` | Pre-creates storage directories | Prevents permission errors when the app tries to write files on first run |
| `EXPOSE 8000` | Documents that the container listens on port 8000 | Used by Docker and `docker-compose.yml` for port mapping |
| `CMD uvicorn app.main:app ...` | Default command to start the API server | Overridden in `docker-compose.yml` to add `--reload` for development hot-reload |

---

## 2. `frontend/Dockerfile`

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
```

### Line-by-line explanation

| Instruction | What it does | Why it matters |
|---|---|---|
| `FROM node:18-alpine` | Uses Node.js 18 on Alpine Linux as the base | Alpine is only ~50 MB; Node 18 is the LTS version |
| `WORKDIR /app` | Sets the working directory | All subsequent paths are relative to `/app` |
| `COPY package*.json ./` | Copies `package.json` and `package-lock.json` **before** the source code | Docker caches layers — if only source code changes, `npm install` is **not** re-run, saving minutes |
| `RUN npm install` | Installs all node_modules (React, MUI, ReactFlow, Vite, etc.) | Runs inside the image so the container is fully self-contained |
| `COPY . .` | Copies the full frontend source code | After `npm install` to maximise cache reuse |
| `EXPOSE 5173` | Documents Vite's default dev server port | |
| `CMD npm run dev -- --host` | Starts the Vite development server | `--host` binds to `0.0.0.0` so the server is reachable from outside the container (your browser) |

---

## 3. `docker-compose.yml` — The Orchestrator

`docker-compose.yml` defines all 5 services and how they connect. One command starts everything:

```bash
docker compose up
```

### Architecture diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         docker compose up                           │
│                                                                     │
│   ┌──────────────┐    ┌─────────────┐                              │
│   │   postgres   │    │    redis    │                              │
│   │   :5432      │    │    :6379    │                              │
│   │  healthcheck │    │  healthcheck│                              │
│   └──────┬───────┘    └──────┬──────┘                              │
│          │  healthy          │  healthy                            │
│          └─────────┬─────────┘                                     │
│                    ▼                                               │
│           ┌────────────────┐     ┌───────────────────┐            │
│           │    backend     │     │    frontend       │            │
│           │    :8000       │◄────│    :5173          │            │
│           │  (FastAPI)     │     │  (Vite / React)   │            │
│           └────────┬───────┘     └───────────────────┘            │
│                    │                                               │
│          ┌─────────┴──────────┐                                   │
│          │                    │                                   │
│  ┌───────────────┐   ┌────────────────┐                          │
│  │ celery-worker │   │ celery-flower  │                          │
│  │ (task queue)  │   │ dashboard :5555│                          │
│  └───────────────┘   └────────────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
```

### Service breakdown

#### `postgres` — Database
```yaml
image: postgres:15-alpine
ports: "5432:5432"
volumes: postgres_data:/var/lib/postgresql/data
healthcheck: pg_isready -U taskmaster
```
- Uses the official Postgres 15 Alpine image — no installation needed
- Data is stored in a **named volume** (`postgres_data`) so it survives `docker compose down`
- Health check prevents dependent services from starting until Postgres is truly ready to accept connections

#### `redis` — Cache & Message Broker
```yaml
image: redis:7-alpine
ports: "6379:6379"
volumes: redis_data:/data
healthcheck: redis-cli ping
```
- Used as both a cache and the Celery task queue broker
- Also persisted via a named volume
- Health check ensures Redis is accepting connections before the backend and workers start

#### `backend` — FastAPI API Server
```yaml
build: ./backend/Dockerfile
ports: "8000:8000"
volumes:
  - ./backend:/app          # live code mount
  - ./screenshots:/app/screenshots
depends_on:
  postgres: condition: service_healthy
  redis:    condition: service_healthy
command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- Built from `backend/Dockerfile`
- `depends_on` with `condition: service_healthy` means it **waits** for Postgres and Redis health checks to pass before starting — prevents startup crashes
- `./backend:/app` volume mount means your local code edits are immediately visible inside the container — combined with `--reload`, the server restarts on save
- Connects to Postgres and Redis using Docker's internal DNS (`postgres`, `redis` hostnames)

#### `celery-worker` — Background Task Worker
```yaml
command: celery -A app.tasks.celery_app worker --loglevel=info
```
- Runs the same backend image but as a Celery worker instead of a web server
- Picks up background tasks (e.g. long-running workflow executions) from the Redis queue
- Shares the same code volume mount as the backend

#### `celery-flower` — Task Monitoring Dashboard
```yaml
ports: "5555:5555"
command: celery -A app.tasks.celery_app flower --port=5555
```
- Web UI at `http://localhost:5555` for monitoring Celery tasks
- Shows queued, running, and completed background tasks in real time

#### `frontend` — Vite / React Dev Server
```yaml
build: ./frontend/Dockerfile
ports: "5173:5173"
volumes:
  - ./frontend:/app          # live code mount
  - /app/node_modules        # anonymous volume — protects container's node_modules
environment:
  VITE_API_URL: http://localhost:8000
depends_on: backend
```
- Built from `frontend/Dockerfile`
- `/app/node_modules` anonymous volume is critical on Windows/Mac — it prevents your host machine's `node_modules` from overwriting the container's installed modules
- `VITE_API_URL` injects the API base URL at build time via Vite's env system

---

## Key Docker Concepts Used

### Layer Caching
Docker builds images in layers. Each instruction (`RUN`, `COPY`) creates a layer that is cached. If nothing above it changed, Docker reuses the cache and skips that step.

```
COPY package*.json ./     ← cached unless package.json changes
RUN npm install           ← cached unless layer above changed  ✓ fast
COPY . .                  ← always runs (code changes frequently)
```

This is why `package.json` is copied before the source code — so `npm install` only reruns when dependencies change, not on every code edit.

### Named vs Anonymous Volumes

| Type | Syntax | Use case |
|---|---|---|
| Named volume | `postgres_data:/var/lib/postgresql/data` | Persist DB data across restarts |
| Bind mount | `./backend:/app` | Sync local code into container for live reload |
| Anonymous volume | `/app/node_modules` | Protect a directory from being overwritten by a bind mount |

### Health Checks & `depends_on`
Without `condition: service_healthy`, Docker starts services based on container start order — but a container can be "started" while its process is still initialising. Health checks confirm the service is **actually ready**:

```yaml
depends_on:
  postgres:
    condition: service_healthy   # waits for pg_isready to pass
  redis:
    condition: service_healthy   # waits for redis-cli ping to pass
```

---

## Running the Full Stack

### Start everything
```bash
docker compose up
```

### Start in background (detached)
```bash
docker compose up -d
```

### Stop everything (keeps data)
```bash
docker compose down
```

### Stop and delete all data volumes
```bash
docker compose down -v
```

### Rebuild after Dockerfile changes
```bash
docker compose up --build
```

### View logs for a specific service
```bash
docker compose logs -f backend
docker compose logs -f frontend
```

### Open a shell inside a running container
```bash
docker compose exec backend bash
docker compose exec frontend sh
```

---

## Service URLs

| Service | URL | Description |
|---|---|---|
| Frontend | http://localhost:5173 | React / Vite UI |
| Backend API | http://localhost:8000 | FastAPI REST API |
| API Docs | http://localhost:8000/docs | Swagger / OpenAPI UI |
| Celery Flower | http://localhost:5555 | Background task monitor |
| PostgreSQL | localhost:5432 | Database (user: taskmaster) |
| Redis | localhost:6379 | Cache & message broker |

---

## Why Docker Instead of Running Locally

| Concern | Without Docker | With Docker |
|---|---|---|
| Setup time | Install Python, Node, Postgres, Redis manually | `docker compose up` — done |
| Version conflicts | Must match exact Python/Node versions | Each container has its own isolated version |
| Playwright on Windows | Chromium deps + asyncio issues | All deps pre-installed inside the Linux container |
| Team consistency | "Works on my machine" problems | Everyone runs the identical environment |
| Database | Must install and configure Postgres locally | Included as a service, pre-configured |
| Onboarding | Hours of setup docs | Clone repo → `docker compose up` → running in minutes |

---

*Made with Bob*

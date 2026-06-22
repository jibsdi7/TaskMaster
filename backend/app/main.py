"""
TaskMaster - Main FastAPI Application
"""
import sys
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api.workflows import router as workflows_router
from app.api.recorder import router as recorder_router
from app.api.blocks import router as blocks_router
from app.api.auth import router as auth_router
from app.api.executions import router as executions_router
from app.api.projects import router as projects_router
from app.core.config import settings
from app.db.database import engine
from app.db import models

# Fix for Windows asyncio subprocess issue with Playwright
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    try:
        models.Base.metadata.create_all(bind=engine)
        print("[OK] Database tables created successfully")
    except Exception as e:
        print(f"[WARNING] Could not connect to database: {e}")
        print("[INFO] Server will start but database operations will fail")
    
    # Development Mode Warning
    if settings.DEV_AUTH_BYPASS:
        print("\n" + "="*60)
        print("WARNING: DEVELOPMENT AUTHENTICATION ENABLED")
        print("="*60)
        print("All API endpoints are accessible without authentication.")
        print("Development user: developer@taskmaster.local")
        print("This mode should NEVER be used in production!")
        print("="*60 + "\n")
    
    yield
    # Shutdown
    pass


app = FastAPI(
    title="TaskMaster API",
    description="User Journey Recorder and Workflow Automation Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(projects_router, prefix="/api/projects", tags=["Projects"])
app.include_router(workflows_router, prefix="/api/workflows", tags=["Workflows"])
app.include_router(recorder_router, prefix="/api/recorder", tags=["Recorder"])
app.include_router(blocks_router, prefix="/api/blocks", tags=["Blocks"])
app.include_router(executions_router, prefix="/api/executions", tags=["Executions"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "TaskMaster API",
        "version": "1.0.0",
        "docs": "/docs",
        "dev_auth_bypass": settings.DEV_AUTH_BYPASS
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "dev_mode": settings.DEV_AUTH_BYPASS
    }

# Made with Bob
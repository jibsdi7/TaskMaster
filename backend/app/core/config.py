"""
Application Configuration
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "TaskMaster"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Development Mode Authentication Bypass
    DEV_AUTH_BYPASS: bool = False
    
    # API
    API_V1_PREFIX: str = "/api"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
    ]
    
    # Database
    DATABASE_URL: str = "postgresql://taskmaster:taskmaster@localhost:5432/taskmaster"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Credential Encryption (AES-256)
    CREDENTIAL_MASTER_KEY: str = "change-this-master-key-in-production-min-32-chars"
    CREDENTIAL_SALT: str = "taskmaster-credential-salt-change-in-prod"
    
    # Playwright
    PLAYWRIGHT_HEADLESS: bool = False
    PLAYWRIGHT_TIMEOUT: int = 30000
    SCREENSHOT_DIR: str = "screenshots"
    
    # File Storage
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    # Workflow Execution
    MAX_WORKFLOW_EXECUTION_TIME: int = 3600  # 1 hour
    MAX_RETRY_ATTEMPTS: int = 3
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

# Made with Bob


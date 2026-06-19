"""
Projects API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.db.database import get_db
from app.db import models
from app.core.security import get_current_user

router = APIRouter()


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: str | None
    owner_id: int
    is_active: bool

    class Config:
        from_attributes = True


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new project"""
    project = models.Project(
        name=project_data.name,
        description=project_data.description,
        owner_id=current_user.id
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """List all projects for current user"""
    projects = db.query(models.Project).filter(
        models.Project.owner_id == current_user.id
    ).all()
    return projects


@router.get("/default", response_model=ProjectResponse)
async def get_or_create_default_project(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get or create a default project for the user"""
    # Try to find existing default project
    project = db.query(models.Project).filter(
        models.Project.owner_id == current_user.id,
        models.Project.name == "Default Project"
    ).first()
    
    if not project:
        # Create default project
        project = models.Project(
            name="Default Project",
            description="Auto-created default project for workflows",
            owner_id=current_user.id
        )
        db.add(project)
        db.commit()
        db.refresh(project)
    
    return project


# Made with Bob
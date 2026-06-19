"""
Workflow API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.db import models
from app.schemas.workflow import WorkflowCreate, WorkflowUpdate, WorkflowResponse
from app.core.security import get_current_user
# Force reload to pick up schema changes

router = APIRouter()


@router.post("/", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    workflow_data: WorkflowCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Create a new workflow"""
    workflow = models.Workflow(
        name=workflow_data.name,
        description=workflow_data.description,
        project_id=workflow_data.project_id,
        creator_id=current_user.id,
        meta_data=workflow_data.metadata or {},
        version=workflow_data.version if getattr(workflow_data, 'version', None) is not None else 1,
        is_active=workflow_data.is_active if getattr(workflow_data, 'is_active', None) is not None else True,
    )
    db.add(workflow)
    db.commit()
    db.refresh(workflow)
    return workflow


@router.get("/", response_model=List[WorkflowResponse])
async def list_workflows(
    skip: int = 0,
    limit: int = 100,
    project_id: int = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """List all workflows"""
    query = db.query(models.Workflow).filter(models.Workflow.creator_id == current_user.id)
    
    if project_id:
        query = query.filter(models.Workflow.project_id == project_id)
    
    workflows = query.offset(skip).limit(limit).all()
    # Convert each workflow using the from_db method
    return [WorkflowResponse.from_db(wf) for wf in workflows]


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific workflow"""
    workflow = db.query(models.Workflow).filter(
        models.Workflow.id == workflow_id,
        models.Workflow.creator_id == current_user.id
    ).first()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    
    return WorkflowResponse.from_db(workflow)


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: int,
    workflow_data: WorkflowUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update a workflow"""
    workflow = db.query(models.Workflow).filter(
        models.Workflow.id == workflow_id,
        models.Workflow.creator_id == current_user.id
    ).first()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    
    # Update fields
    if workflow_data.name is not None:
        workflow.name = workflow_data.name
    if workflow_data.description is not None:
        workflow.description = workflow_data.description
    if workflow_data.metadata is not None:
        workflow.meta_data = workflow_data.metadata
    
    db.commit()
    db.refresh(workflow)
    return workflow


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete a workflow"""
    workflow = db.query(models.Workflow).filter(
        models.Workflow.id == workflow_id,
        models.Workflow.creator_id == current_user.id
    ).first()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )
    
    db.delete(workflow)
    db.commit()
    return None

# Made with Bob
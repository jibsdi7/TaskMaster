"""
Execution API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.db import models
from app.schemas.workflow import WorkflowRunResponse, WorkflowLogResponse
from app.core.security import get_current_user

router = APIRouter()


@router.get("", response_model=List[WorkflowRunResponse])
async def list_executions(
    workflow_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """List workflow executions"""
    # Get workflows owned by user
    user_workflow_ids = db.query(models.Workflow.id).filter(
        models.Workflow.creator_id == current_user.id
    ).all()
    user_workflow_ids = [wf[0] for wf in user_workflow_ids]
    
    query = db.query(models.WorkflowRun).filter(
        models.WorkflowRun.workflow_id.in_(user_workflow_ids)
    )
    
    if workflow_id:
        query = query.filter(models.WorkflowRun.workflow_id == workflow_id)
    
    if status_filter:
        query = query.filter(models.WorkflowRun.status == status_filter)
    
    runs = query.order_by(models.WorkflowRun.created_at.desc()).offset(skip).limit(limit).all()
    return runs


@router.get("/{run_id}", response_model=WorkflowRunResponse)
async def get_execution(
    run_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific execution"""
    run = db.query(models.WorkflowRun).filter(
        models.WorkflowRun.run_id == run_id
    ).first()
    
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Execution not found"
        )
    
    # Check if user owns the workflow
    workflow = db.query(models.Workflow).filter(
        models.Workflow.id == run.workflow_id,
        models.Workflow.creator_id == current_user.id
    ).first()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return run


@router.get("/{run_id}/logs", response_model=List[WorkflowLogResponse])
async def get_execution_logs(
    run_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get logs for a specific execution"""
    run = db.query(models.WorkflowRun).filter(
        models.WorkflowRun.run_id == run_id
    ).first()
    
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Execution not found"
        )
    
    # Check if user owns the workflow
    workflow = db.query(models.Workflow).filter(
        models.Workflow.id == run.workflow_id,
        models.Workflow.creator_id == current_user.id
    ).first()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    logs = db.query(models.WorkflowLog).filter(
        models.WorkflowLog.run_id == run.id
    ).order_by(models.WorkflowLog.created_at.asc()).all()
    
    return logs


@router.get("/{run_id}/screenshots")
async def get_execution_screenshots(
    run_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get screenshots for a specific execution"""
    run = db.query(models.WorkflowRun).filter(
        models.WorkflowRun.run_id == run_id
    ).first()
    
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Execution not found"
        )
    
    # Check if user owns the workflow
    workflow = db.query(models.Workflow).filter(
        models.Workflow.id == run.workflow_id,
        models.Workflow.creator_id == current_user.id
    ).first()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    logs_with_screenshots = db.query(models.WorkflowLog).filter(
        models.WorkflowLog.run_id == run.id,
        models.WorkflowLog.screenshot_path.isnot(None)
    ).order_by(models.WorkflowLog.created_at.asc()).all()
    
    screenshots = [
        {
            "node_id": log.node_id,
            "screenshot_path": log.screenshot_path,
            "timestamp": log.created_at.isoformat()
        }
        for log in logs_with_screenshots
    ]
    
    return {
        "run_id": run_id,
        "screenshots": screenshots,
        "count": len(screenshots)
    }


@router.delete("/{run_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_execution(
    run_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete an execution"""
    run = db.query(models.WorkflowRun).filter(
        models.WorkflowRun.run_id == run_id
    ).first()
    
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Execution not found"
        )
    
    # Check if user owns the workflow
    workflow = db.query(models.Workflow).filter(
        models.Workflow.id == run.workflow_id,
        models.Workflow.creator_id == current_user.id
    ).first()
    
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    db.delete(run)
    db.commit()
    
    return None

# Made with Bob

"""
Audit log API endpoints
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.db.database import get_db
from app.db import models
from app.core.security import get_current_user
from pydantic import BaseModel

router = APIRouter()


class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    action: str
    resource_type: Optional[str]
    resource_id: Optional[int]
    details: dict
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=List[AuditLogResponse])
async def list_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action type"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type (workflow, block, user, recording)"),
    resource_id: Optional[int] = Query(None, description="Filter by specific resource ID"),
    limit: int = Query(100, le=500),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List audit logs for the current user, newest first."""
    query = db.query(models.AuditLog).filter(
        models.AuditLog.user_id == current_user.id
    )

    if action:
        query = query.filter(models.AuditLog.action == action)
    if resource_type:
        query = query.filter(models.AuditLog.resource_type == resource_type)
    if resource_id is not None:
        query = query.filter(models.AuditLog.resource_id == resource_id)

    logs = (
        query.order_by(models.AuditLog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return logs


@router.get("/actions")
async def list_audit_actions(
    current_user: models.User = Depends(get_current_user),
):
    """Return all valid audit action values for use as filter options."""
    return [a.value for a in models.AuditAction]

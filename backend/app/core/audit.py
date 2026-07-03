"""
Audit logging helper — write an AuditLog row from anywhere in the app.
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from sqlalchemy.orm import Session

from app.db import models


def log_audit(
    db: Session,
    user_id: int,
    action: models.AuditAction,
    resource_type: Optional[str] = None,
    resource_id: Optional[int] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> models.AuditLog:
    """
    Insert an AuditLog row and flush it within the current transaction.
    The caller is responsible for calling db.commit().
    """
    entry = models.AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details or {},
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(entry)
    db.flush()
    return entry

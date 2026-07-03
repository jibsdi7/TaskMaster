"""
Scheduler API endpoints — CRUD for ScheduledJob records.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from apscheduler.triggers.cron import CronTrigger
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db import models
from app.db.database import get_db
from app.services.scheduler import scheduler_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class ScheduledJobCreate(BaseModel):
    name: str
    workflow_id: int
    schedule_type: str          # "one_time" | "cron"
    run_at: Optional[datetime] = None          # required for one_time
    cron_expression: Optional[str] = None      # required for cron

    @field_validator("schedule_type")
    @classmethod
    def _validate_type(cls, v: str) -> str:
        if v not in ("one_time", "cron"):
            raise ValueError("schedule_type must be 'one_time' or 'cron'")
        return v

    @field_validator("cron_expression")
    @classmethod
    def _validate_cron(cls, v: Optional[str], info) -> Optional[str]:
        if v is not None:
            try:
                CronTrigger.from_crontab(v, timezone="UTC")
            except Exception:
                raise ValueError(f"Invalid cron expression: {v!r}")
        return v


class ScheduledJobResponse(BaseModel):
    id: int
    name: str
    workflow_id: int
    creator_id: int
    schedule_type: str
    run_at: Optional[datetime]
    cron_expression: Optional[str]
    is_enabled: bool
    last_run_at: Optional[datetime]
    last_run_status: Optional[str]
    run_count: int
    created_at: datetime
    updated_at: Optional[datetime]
    # Convenience: resolved workflow name
    workflow_name: Optional[str] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_response(job: models.ScheduledJob) -> ScheduledJobResponse:
    return ScheduledJobResponse(
        id=job.id,
        name=job.name,
        workflow_id=job.workflow_id,
        creator_id=job.creator_id,
        schedule_type=job.schedule_type.value,
        run_at=job.run_at,
        cron_expression=job.cron_expression,
        is_enabled=job.is_enabled,
        last_run_at=job.last_run_at,
        last_run_status=job.last_run_status,
        run_count=job.run_count or 0,
        created_at=job.created_at,
        updated_at=job.updated_at,
        workflow_name=job.workflow.name if job.workflow else None,
    )


def _assert_owns_job(job: models.ScheduledJob | None, current_user: models.User) -> models.ScheduledJob:
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
    if job.creator_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return job


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/", response_model=List[ScheduledJobResponse])
def list_schedules(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all scheduled jobs belonging to the current user."""
    jobs = (
        db.query(models.ScheduledJob)
        .filter(models.ScheduledJob.creator_id == current_user.id)
        .order_by(models.ScheduledJob.created_at.desc())
        .all()
    )
    return [_to_response(j) for j in jobs]


@router.post("/", response_model=ScheduledJobResponse, status_code=status.HTTP_201_CREATED)
def create_schedule(
    payload: ScheduledJobCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a new scheduled job."""
    # Validate the target workflow is owned by this user
    workflow = db.query(models.Workflow).filter(
        models.Workflow.id == payload.workflow_id,
        models.Workflow.creator_id == current_user.id,
    ).first()
    if not workflow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found")

    # Validate required fields per type
    if payload.schedule_type == "one_time" and payload.run_at is None:
        raise HTTPException(status_code=400, detail="run_at is required for one_time schedules")
    if payload.schedule_type == "cron" and not payload.cron_expression:
        raise HTTPException(status_code=400, detail="cron_expression is required for cron schedules")

    job = models.ScheduledJob(
        name=payload.name,
        workflow_id=payload.workflow_id,
        creator_id=current_user.id,
        schedule_type=models.ScheduleType(payload.schedule_type),
        run_at=payload.run_at,
        cron_expression=payload.cron_expression,
        is_enabled=True,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Register with APScheduler
    scheduler_service.add_job(job.id, payload.schedule_type, payload.run_at, payload.cron_expression)

    return _to_response(job)


@router.patch("/{job_id}/toggle", response_model=ScheduledJobResponse)
def toggle_schedule(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Enable or disable a scheduled job."""
    job = db.query(models.ScheduledJob).filter(models.ScheduledJob.id == job_id).first()
    job = _assert_owns_job(job, current_user)

    job.is_enabled = not job.is_enabled
    db.commit()
    db.refresh(job)

    if job.is_enabled:
        scheduler_service.resume_job(job.id, job.schedule_type.value, job.run_at, job.cron_expression)
    else:
        scheduler_service.remove_job(job.id)

    return _to_response(job)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a scheduled job."""
    job = db.query(models.ScheduledJob).filter(models.ScheduledJob.id == job_id).first()
    job = _assert_owns_job(job, current_user)

    scheduler_service.remove_job(job.id)
    db.delete(job)
    db.commit()

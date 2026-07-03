"""
Dashboard API — aggregated statistics for the FlowWeaver dashboard.
GET /api/dashboard
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Optional

from app.db.database import get_db
from app.db import models
from app.core.security import get_current_user

router = APIRouter()


@router.get("")
async def get_dashboard(
    days: int = Query(default=7, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return aggregated dashboard statistics for the current user."""

    # ── User-scoped workflow IDs ──────────────────────────────────────
    wf_ids_q = db.query(models.Workflow.id).filter(
        models.Workflow.creator_id == current_user.id
    ).all()
    wf_ids = [r[0] for r in wf_ids_q]

    since = datetime.utcnow() - timedelta(days=days)

    # ── Summary counts ────────────────────────────────────────────────
    total_workflows = db.query(models.Workflow).filter(
        models.Workflow.creator_id == current_user.id
    ).count()

    active_workflows = db.query(models.Workflow).filter(
        models.Workflow.creator_id == current_user.id,
        models.Workflow.is_active == True,
    ).count()

    reusable_blocks = db.query(models.Block).filter(
        models.Block.creator_id == current_user.id
    ).count()

    # All-time run totals
    total_executions = db.query(models.WorkflowRun).filter(
        models.WorkflowRun.workflow_id.in_(wf_ids)
    ).count() if wf_ids else 0

    successful_runs = db.query(models.WorkflowRun).filter(
        models.WorkflowRun.workflow_id.in_(wf_ids),
        models.WorkflowRun.status == models.WorkflowStatus.COMPLETED,
    ).count() if wf_ids else 0

    failed_runs = db.query(models.WorkflowRun).filter(
        models.WorkflowRun.workflow_id.in_(wf_ids),
        models.WorkflowRun.status == models.WorkflowStatus.FAILED,
    ).count() if wf_ids else 0

    success_rate = round(successful_runs / total_executions * 100, 1) if total_executions > 0 else 0.0

    # ── Execution trend (per-day, zero-filled) ────────────────────────
    # Use the actual date range of existing runs so clock-skew between the
    # DB rows and the server clock never produces an empty window.
    first_run = (
        db.query(func.min(models.WorkflowRun.started_at))
        .filter(models.WorkflowRun.workflow_id.in_(wf_ids))
        .scalar()
    ) if wf_ids else None

    if first_run is not None:
        # Anchor window to the most-recent run, not to utcnow()
        latest_run = (
            db.query(func.max(models.WorkflowRun.started_at))
            .filter(models.WorkflowRun.workflow_id.in_(wf_ids))
            .scalar()
        )
        window_end   = latest_run.date() if latest_run else datetime.utcnow().date()
        window_start = window_end - timedelta(days=days - 1)
    else:
        window_end   = datetime.utcnow().date()
        window_start = window_end - timedelta(days=days - 1)

    trend_rows = (
        db.query(
            func.date(models.WorkflowRun.started_at).label("day"),
            func.count().label("count"),
        )
        .filter(
            models.WorkflowRun.workflow_id.in_(wf_ids),
            func.date(models.WorkflowRun.started_at) >= str(window_start),
            func.date(models.WorkflowRun.started_at) <= str(window_end),
        )
        .group_by(func.date(models.WorkflowRun.started_at))
        .order_by(func.date(models.WorkflowRun.started_at))
        .all()
    ) if wf_ids else []

    # Zero-fill every day in the window so the chart is a continuous series
    counts_by_day = {str(r.day): r.count for r in trend_rows}
    execution_trend = []
    for offset in range(days):
        from datetime import date as date_type
        day = (window_start + timedelta(days=offset)).strftime("%Y-%m-%d")
        execution_trend.append({"date": day, "count": counts_by_day.get(day, 0)})

    # ── Execution status breakdown (period) ───────────────────────────
    status_rows = (
        db.query(models.WorkflowRun.status, func.count().label("count"))
        .filter(
            models.WorkflowRun.workflow_id.in_(wf_ids),
            models.WorkflowRun.started_at >= since,
        )
        .group_by(models.WorkflowRun.status)
        .all()
    ) if wf_ids else []

    status_breakdown = {str(r.status).lower(): r.count for r in status_rows}

    # ── Workflow distribution (top 10 by run count) ───────────────────
    dist_rows = (
        db.query(
            models.Workflow.name,
            func.count(models.WorkflowRun.id).label("runs"),
        )
        .join(models.WorkflowRun, models.WorkflowRun.workflow_id == models.Workflow.id)
        .filter(models.Workflow.creator_id == current_user.id)
        .group_by(models.Workflow.name)
        .order_by(func.count(models.WorkflowRun.id).desc())
        .limit(10)
        .all()
    )
    workflow_distribution = [{"name": r.name, "runs": r.runs} for r in dist_rows]

    # ── Recent executions (last 20) ───────────────────────────────────
    recent_runs = (
        db.query(models.WorkflowRun, models.Workflow.name.label("workflow_name"))
        .join(models.Workflow, models.Workflow.id == models.WorkflowRun.workflow_id)
        .filter(models.WorkflowRun.workflow_id.in_(wf_ids))
        .order_by(models.WorkflowRun.started_at.desc())
        .limit(20)
        .all()
    ) if wf_ids else []

    recent_executions = [
        {
            "run_id": run.run_id,
            "workflow_name": wf_name,
            "status": str(run.status).lower(),
            "started_at": run.started_at.isoformat() if run.started_at else None,
            "completed_at": run.completed_at.isoformat() if run.completed_at else None,
            "duration_seconds": run.duration_seconds,
            "triggered_by": "manual",
        }
        for run, wf_name in recent_runs
    ]

    return {
        "totalWorkflows": total_workflows,
        "activeWorkflows": active_workflows,
        "totalExecutions": total_executions,
        "successfulRuns": successful_runs,
        "failedRuns": failed_runs,
        "successRate": success_rate,
        "reusableBlocks": reusable_blocks,
        "periodDays": days,
        "executionTrend": execution_trend,
        "statusBreakdown": status_breakdown,
        "workflowDistribution": workflow_distribution,
        "recentExecutions": recent_executions,
    }

# Made with Bob

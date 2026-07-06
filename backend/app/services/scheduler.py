"""
Scheduler Service — APScheduler-backed workflow scheduler.

Uses a BackgroundScheduler (daemon thread) so it works alongside Uvicorn's
asyncio event loop with zero extra infrastructure.  All state is persisted in
the SQLite `scheduled_jobs` table so schedules survive server restarts.
"""
from __future__ import annotations

import sys
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger

logger = logging.getLogger(__name__)


class SchedulerService:
    """Singleton service that manages APScheduler and fires workflow runs."""

    def __init__(self) -> None:
        self._scheduler = BackgroundScheduler(timezone="UTC")
        self._started = False

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def start(self) -> None:
        """Load all enabled jobs from the DB and start the scheduler."""
        if self._started:
            return
        self._load_jobs_from_db()
        self._scheduler.start()
        self._started = True
        logger.info("[Scheduler] Started — %d job(s) loaded", len(self._scheduler.get_jobs()))

    def shutdown(self) -> None:
        if self._started:
            self._scheduler.shutdown(wait=False)
            self._started = False
            logger.info("[Scheduler] Shut down")

    # ------------------------------------------------------------------
    # Public API (called from the router)
    # ------------------------------------------------------------------

    def add_job(self, job_id: int, schedule_type: str, run_at: Optional[datetime], cron_expression: Optional[str]) -> None:
        """Register a job with APScheduler."""
        trigger = self._make_trigger(schedule_type, run_at, cron_expression)
        if trigger is None:
            return
        self._scheduler.add_job(
            self._fire_job,
            trigger=trigger,
            id=str(job_id),
            args=[job_id],
            replace_existing=True,
            misfire_grace_time=300,  # allow 5-min late fire
        )
        logger.info("[Scheduler] Job %d registered (%s)", job_id, schedule_type)

    def remove_job(self, job_id: int) -> None:
        """Remove a job from APScheduler (silently if not found)."""
        try:
            self._scheduler.remove_job(str(job_id))
            logger.info("[Scheduler] Job %d removed", job_id)
        except Exception:
            pass

    def pause_job(self, job_id: int) -> None:
        try:
            self._scheduler.pause_job(str(job_id))
        except Exception:
            pass

    def resume_job(self, job_id: int, schedule_type: str, run_at: Optional[datetime], cron_expression: Optional[str]) -> None:
        """Re-register job (needed if it was removed while disabled)."""
        self.add_job(job_id, schedule_type, run_at, cron_expression)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _load_jobs_from_db(self) -> None:
        """Read all enabled ScheduledJobs from SQLite and register them."""
        from app.db.database import SessionLocal
        from app.db.models import ScheduledJob

        db = SessionLocal()
        try:
            jobs = db.query(ScheduledJob).filter(ScheduledJob.is_enabled == True).all()
            for job in jobs:
                trigger = self._make_trigger(
                    job.schedule_type.value,
                    job.run_at,
                    job.cron_expression,
                )
                if trigger is None:
                    continue
                self._scheduler.add_job(
                    self._fire_job,
                    trigger=trigger,
                    id=str(job.id),
                    args=[job.id],
                    replace_existing=True,
                    misfire_grace_time=300,
                )
        finally:
            db.close()

    @staticmethod
    def _make_trigger(schedule_type: str, run_at: Optional[datetime], cron_expression: Optional[str]):
        if schedule_type == "one_time":
            if run_at is None:
                return None
            # Ensure timezone-aware for APScheduler
            if run_at.tzinfo is None:
                run_at = run_at.replace(tzinfo=timezone.utc)
            return DateTrigger(run_date=run_at, timezone="UTC")
        elif schedule_type == "cron":
            if not cron_expression:
                return None
            return CronTrigger.from_crontab(cron_expression, timezone="UTC")
        return None

    @staticmethod
    def _fire_job(job_id: int) -> None:
        """Executed by APScheduler in a background thread.
        Runs all workflows in job.workflow_ids sequentially, in order.
        """
        from app.db.database import SessionLocal
        from app.db.models import ScheduledJob, ScheduleType

        db = SessionLocal()
        try:
            job = db.query(ScheduledJob).filter(ScheduledJob.id == job_id).first()
            if not job or not job.is_enabled:
                return

            # Determine ordered list of workflow IDs to run
            ordered_ids = job.workflow_ids if job.workflow_ids else [job.workflow_id]
            ordered_ids = [wid for wid in ordered_ids if wid]  # strip None

            logger.info(
                "[Scheduler] Firing job %d — running %d workflow(s) in order: %s",
                job_id, len(ordered_ids), ordered_ids,
            )

            results = []
            for wid in ordered_ids:
                logger.info("[Scheduler] Job %d — starting workflow %d", job_id, wid)
                wf_status = SchedulerService._run_workflow(wid, db)
                results.append(wf_status)
                logger.info("[Scheduler] Job %d — workflow %d finished: %s", job_id, wid, wf_status)
                if wf_status == "failed":
                    logger.warning("[Scheduler] Job %d — stopping chain at workflow %d (failed)", job_id, wid)
                    break  # stop chain on first failure

            # Aggregate status: all success → "success", mix → "partial", all failed → "failed"
            if all(r == "success" for r in results):
                overall = "success"
            elif all(r == "failed" for r in results):
                overall = "failed"
            else:
                overall = "partial"

            job.last_run_at = datetime.utcnow()
            job.last_run_status = overall
            job.run_count = (job.run_count or 0) + 1
            # One-time jobs self-disable after firing
            if job.schedule_type == ScheduleType.ONE_TIME:
                job.is_enabled = False
            db.commit()
            logger.info("[Scheduler] Job %d completed — status: %s", job_id, overall)
        except Exception as exc:
            logger.exception("[Scheduler] Job %d failed: %s", job_id, exc)
            db.rollback()
        finally:
            db.close()

    @staticmethod
    def _run_workflow(workflow_id: int, db) -> str:
        """Re-use the exact same execution path as the manual /execute endpoint."""
        import uuid
        import platform
        from app.db import models

        workflow = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
        if not workflow:
            logger.error("[Scheduler] Workflow %d not found", workflow_id)
            return "failed"

        run_id = str(uuid.uuid4())
        workflow_run = models.WorkflowRun(
            workflow_id=workflow.id,
            run_id=run_id,
            status=models.WorkflowStatus.DRAFT,
            meta_data={"triggered_by": "scheduler"},
        )
        db.add(workflow_run)
        db.commit()
        db.refresh(workflow_run)

        nodes_data = [
            {
                "node_id": n.node_id,
                "node_type": n.node_type.value,
                "label": n.label,
                "config": n.config or {},
                "metadata": n.meta_data or {},
                "position_x": n.position_x or 0,
                "position_y": n.position_y or 0,
            }
            for n in workflow.nodes
        ]
        edges_data = [
            {
                "edge_id": e.edge_id,
                "source_node_id": e.source_node_id,
                "target_node_id": e.target_node_id,
            }
            for e in workflow.edges
        ]

        try:
            if sys.platform == "win32" or platform.system() == "Windows":
                from app.services.workflow_executor_sync import WorkflowExecutorSync
                executor = WorkflowExecutorSync()
                result = executor.execute(nodes=nodes_data, edges=edges_data, inputs={}, run_id=run_id)
            else:
                from app.services.workflow_executor import WorkflowExecutor
                loop = asyncio.new_event_loop()
                try:
                    executor = WorkflowExecutor()
                    result = loop.run_until_complete(
                        executor.execute(nodes=nodes_data, edges=edges_data, inputs={}, run_id=run_id)
                    )
                finally:
                    loop.close()

            workflow_run.status = models.WorkflowStatus.COMPLETED
            started_at = result.get("started_at")
            completed_at = result.get("completed_at")
            workflow_run.started_at = started_at if isinstance(started_at, datetime) else (datetime.fromisoformat(started_at) if started_at else None)
            workflow_run.completed_at = completed_at if isinstance(completed_at, datetime) else (datetime.fromisoformat(completed_at) if completed_at else None)
            workflow_run.duration_seconds = result.get("duration_seconds")
            workflow_run.result = result.get("result", {})
            db.commit()
            return "success"

        except Exception as exc:
            logger.exception("[Scheduler] Workflow %d execution error: %s", workflow_id, exc)
            workflow_run.status = models.WorkflowStatus.FAILED
            workflow_run.error_message = str(exc)
            db.commit()
            return "failed"


# Module-level singleton shared across the app
scheduler_service = SchedulerService()

"""Celery application module."""
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "taskmaster",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Example placeholder task
@celery_app.task(name="taskmaster.ping")
def ping():
    return "pong"

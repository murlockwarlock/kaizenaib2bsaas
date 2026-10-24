from celery import Celery
from kombu import Queue

from core.config import settings

celery_app = Celery(
    "ai_editor_worker",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["services.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_default_queue=settings.CELERY_QUEUE_NAME,
    task_default_exchange="ai_editor",
    task_default_routing_key="ai_editor",
    task_queues=(
        Queue(settings.CELERY_QUEUE_NAME, routing_key=settings.CELERY_QUEUE_NAME),
    ),
    task_routes={
        "generate_kie_task": {
            "queue": settings.CELERY_QUEUE_NAME,
            "routing_key": settings.CELERY_QUEUE_NAME,
        },
        "reconcile_generation_tasks": {
            "queue": settings.CELERY_QUEUE_NAME,
            "routing_key": settings.CELERY_QUEUE_NAME,
        },
    },
    # KIE task creation has no idempotency key. Late acknowledgement could
    # replay a successful provider submission after a worker crash.
    task_acks_late=False,
    task_reject_on_worker_lost=False,
    worker_prefetch_multiplier=1,
    worker_concurrency=settings.CELERY_WORKER_CONCURRENCY,
    task_soft_time_limit=settings.CELERY_TASK_SOFT_TIME_LIMIT,
    task_time_limit=settings.CELERY_TASK_TIME_LIMIT,
    worker_max_tasks_per_child=100,
    broker_connection_retry_on_startup=True,
    result_expires=3600,
    beat_schedule={
        "reconcile-generation-tasks": {
            "task": "reconcile_generation_tasks",
            "schedule": settings.CELERY_RECONCILIATION_INTERVAL_SECONDS,
            "options": {"queue": settings.CELERY_QUEUE_NAME},
        },
    },
)

from celery import Celery
from kombu import Queue

celery_app = Celery(
    "ai_editor_worker",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0",
    include=["services.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_default_queue="ai_editor",
    task_default_exchange="ai_editor",
    task_default_routing_key="ai_editor",
    task_queues=(
        Queue("ai_editor", routing_key="ai_editor"),
    ),
    task_routes={
        "generate_kie_task": {"queue": "ai_editor", "routing_key": "ai_editor"},
    },
)

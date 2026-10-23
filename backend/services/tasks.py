import asyncio
from core.celery_app import celery_app
from services.kie_ai import request_kie_generation
from core.database import SessionLocal
from models.task import Task
from services.admin_logs import log_admin_event, log_admin_exception
from services.generation_refunds import refund_task_credits_once
from services.notifications import create_generation_notification
from datetime import datetime, timezone

@celery_app.task(name="generate_kie_task", bind=True)
def generate_kie_task(self, task_id: int, model: str, inputs: dict):
    log_admin_event(
        level="INFO",
        scope="generation",
        event="celery_task_started",
        message=f"Celery started generation task for model {model}",
        task_id=task_id,
        details={"model": model, "inputs": inputs},
    )
    # Execute async function to request generation
    try:
        task_id_vendor = asyncio.run(request_kie_generation(model, inputs))
    except Exception as e:
        # Mark as failed in DB if request fails
        db = SessionLocal()
        task_record = db.query(Task).filter(Task.id == task_id).first()
        if task_record:
            task_record.status = "failed"
            task_record.error_message = str(e)
            task_record.error_details = repr(e)
            task_record.provider_status = "request_failed"
            task_record.completed_at = datetime.now(timezone.utc)
            refund_task_credits_once(
                db,
                task_record,
                reason="provider_request_failed",
                error_message=str(e),
                notify=True,
            )
            db.commit()
        db.close()
        log_admin_exception(
            scope="generation",
            event="celery_task_failed",
            message=f"Celery failed to enqueue vendor generation for task #{task_id}",
            exc=e,
            task_id=task_id,
            details={"model": model, "inputs": inputs},
        )
        raise e

    # Update DB with vendor task ID
    db = SessionLocal()
    task_record = db.query(Task).filter(Task.id == task_id).first()
    if task_record:
        task_record.task_id_vendor = task_id_vendor
        task_record.status = "processing"
        task_record.provider_status = "queued"
        task_record.started_at = datetime.now(timezone.utc)
        task_record.error_message = None
        task_record.error_details = None
        create_generation_notification(
            db,
            task=task_record,
            kind="generation_queued",
            dedupe=True,
        )
        db.commit()
    db.close()
    log_admin_event(
        level="INFO",
        scope="generation",
        event="vendor_task_created",
        message=f"Vendor task created for generation task #{task_id}",
        task_id=task_id,
        details={"model": model, "vendor_task_id": str(task_id_vendor)},
    )

    return str(task_id_vendor)

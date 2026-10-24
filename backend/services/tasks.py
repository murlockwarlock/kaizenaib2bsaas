import asyncio
from datetime import datetime, timedelta, timezone

from core.celery_app import celery_app
from services.kie_ai import KieApiError, check_task_status, request_kie_generation
from core.database import SessionLocal
from models.task import Task
from services.admin_logs import log_admin_event, log_admin_exception
from services.generation_refunds import refund_task_credits_once
from services.notifications import create_generation_notification

@celery_app.task(name="generate_kie_task", bind=True)
def generate_kie_task(self, task_id: int, model: str, inputs: dict):
    log_admin_event(
        level="INFO",
        scope="generation",
        event="celery_task_started",
        message=f"Celery started generation task for model {model}",
        task_id=task_id,
        details={"model": model, "input_keys": sorted(inputs.keys())},
    )
    db = SessionLocal()
    task_record = db.query(Task).filter(Task.id == task_id).first()
    if not task_record:
        db.close()
        log_admin_event(
            level="WARNING",
            scope="generation",
            event="celery_task_missing",
            message=f"Celery task #{task_id} no longer exists",
            task_id=task_id,
            details={"model": model},
        )
        return None

    # Make the reservation visible while the provider request is in flight.
    task_record.status = "processing"
    task_record.provider_status = "submitting"
    task_record.started_at = datetime.now(timezone.utc)
    db.commit()

    # Execute async function to request generation
    try:
        task_id_vendor = asyncio.run(request_kie_generation(model, inputs))
    except Exception as e:
        db.rollback()
        task_record = db.query(Task).filter(Task.id == task_id).first()
        if task_record:
            uncertain = isinstance(e, KieApiError) and e.uncertain
            task_record.status = "submission_unknown" if uncertain else "failed"
            task_record.error_message = (
                "The provider did not confirm whether the request was accepted. "
                "Your credits remain reserved while this is verified."
                if uncertain
                else str(e)
            )
            task_record.error_details = repr(e)
            task_record.provider_status = "provider_confirmation_pending" if uncertain else "request_failed"
            task_record.completed_at = datetime.now(timezone.utc)
            if uncertain:
                create_generation_notification(
                    db,
                    task=task_record,
                    kind="generation_failed",
                    error_message=task_record.error_message,
                    credits_refunded=False,
                    dedupe=True,
                )
            else:
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
            details={"model": model, "input_keys": sorted(inputs.keys())},
        )
        return None

    # Update DB with vendor task ID
    db.rollback()
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


async def _reconcile_provider_tasks(db, task_records: list[Task]) -> int:
    """Reconcile provider tasks without charging or refunding twice.

    Client polling is not a durable processing mechanism: a browser can close,
    a frontend can be offline, and a worker can disappear after submitting a
    provider task. The periodic Celery task keeps the database moving even
    when nobody is polling. Provider failures are refunded through the same
    row-lock/idempotent helper used by callbacks and the API endpoint.
    """
    changed = 0
    for task in task_records:
        if task.status in {"success", "failed"}:
            continue

        if not task.task_id_vendor:
            created_at = task.created_at or datetime.now(timezone.utc)
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) - created_at > timedelta(minutes=15):
                task.status = "submission_unknown"
                task.provider_status = "worker_confirmation_timeout"
                task.error_message = (
                    "The worker did not confirm whether the provider accepted the request. "
                    "Your credits remain reserved while this is verified."
                )
                task.completed_at = datetime.now(timezone.utc)
                create_generation_notification(
                    db,
                    task=task,
                    kind="generation_failed",
                    error_message=task.error_message,
                    credits_refunded=False,
                    dedupe=True,
                )
                db.commit()
                changed += 1
            continue

        try:
            provider_status = await check_task_status(task.task_id_vendor)
        except Exception as exc:
            db.rollback()
            fresh_task = db.query(Task).filter(Task.id == task.id).first()
            if fresh_task and fresh_task.status in {"pending", "processing"}:
                fresh_task.provider_status = "provider_status_unavailable"
                fresh_task.error_message = (
                    "The provider status is temporarily unavailable. "
                    "Credits remain reserved while we verify the task."
                )
                fresh_task.error_details = repr(exc)
                db.commit()
                changed += 1
            log_admin_exception(
                scope="generation",
                event="reconciliation_provider_error",
                message=f"Provider status unavailable for task #{task.id}",
                exc=exc,
                task_id=task.id,
                user_id=task.user_id,
                details={"vendor_task_id": task.task_id_vendor},
            )
            continue

        if provider_status.get("status") == "success":
            task.status = "success"
            task.output_url = provider_status.get("output_url")
            task.provider_status = str(provider_status.get("provider_status") or "success")
            task.completed_at = datetime.now(timezone.utc)
            task.error_message = None
            task.error_details = None
            create_generation_notification(db, task=task, kind="generation_completed", dedupe=True)
            db.commit()
            changed += 1
        elif provider_status.get("status") in {"failed", "error"}:
            task.status = "failed"
            task.provider_status = str(provider_status.get("provider_status") or "failed")
            task.error_message = provider_status.get("error_message") or "Provider reported failure"
            task.error_details = str(provider_status.get("raw_response") or "")[:10_000]
            task.completed_at = datetime.now(timezone.utc)
            refund_task_credits_once(
                db,
                task,
                reason="provider_reconciliation_failure",
                error_message=task.error_message,
                notify=True,
            )
            db.commit()
            changed += 1
        else:
            task.status = "processing"
            task.provider_status = str(provider_status.get("provider_status") or "processing")
            if task.error_message == (
                "The provider status is temporarily unavailable. Credits remain reserved while we verify the task."
            ):
                task.error_message = None
                task.error_details = None
            db.commit()

    return changed


@celery_app.task(name="reconcile_generation_tasks", ignore_result=True)
def reconcile_generation_tasks(limit: int = 50) -> int:
    """Process stale/pending generation rows independently of client polling."""
    db = SessionLocal()
    try:
        task_records = (
            db.query(Task)
            .filter(Task.status.in_(("pending", "processing")))
            .order_by(Task.created_at.asc(), Task.id.asc())
            .limit(max(1, min(int(limit), 200)))
            .all()
        )
        return asyncio.run(_reconcile_provider_tasks(db, task_records))
    finally:
        db.close()

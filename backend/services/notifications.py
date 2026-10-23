import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from models.notification import UserNotification
from models.task import Task


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def create_user_notification(
    db: Session,
    *,
    user_id: int,
    kind: str,
    title: str | None = None,
    message: str | None = None,
    task_id: int | None = None,
    metadata: dict[str, Any] | None = None,
    dedupe: bool = False,
) -> UserNotification:
    if dedupe:
        query = db.query(UserNotification).filter(
            UserNotification.user_id == user_id,
            UserNotification.kind == kind,
        )
        if task_id is not None:
            query = query.filter(UserNotification.task_id == task_id)
        existing = query.order_by(UserNotification.id.desc()).first()
        if existing:
            return existing

    notification = UserNotification(
        user_id=user_id,
        task_id=task_id,
        kind=kind,
        title=title,
        message=message,
        metadata_json=json.dumps(metadata, ensure_ascii=False) if metadata else None,
    )
    db.add(notification)
    return notification


def create_generation_notification(
    db: Session,
    *,
    task: Task,
    kind: str,
    error_message: str | None = None,
    credits_refunded: bool = False,
    dedupe: bool = True,
) -> UserNotification:
    title_map = {
        "generation_queued": "Generation started",
        "generation_completed": "Generation completed",
        "generation_failed": "Generation failed",
    }
    message_map = {
        "generation_queued": "Your generation has been queued.",
        "generation_completed": "Your generation is ready.",
        "generation_failed": "Your generation failed. Credits were returned to your balance." if credits_refunded else "Your generation failed.",
    }
    metadata = {
        "task_id": task.id,
        "model": task.model,
        "category": task.category,
        "cost": float(task.cost or 0),
        "status": task.status,
        "provider_status": task.provider_status,
        "error_message": error_message or task.error_message,
        "credits_refunded": credits_refunded,
        "created_at": utcnow().isoformat(),
    }
    return create_user_notification(
        db,
        user_id=task.user_id,
        task_id=task.id,
        kind=kind,
        title=title_map.get(kind),
        message=message_map.get(kind),
        metadata=metadata,
        dedupe=dedupe,
    )

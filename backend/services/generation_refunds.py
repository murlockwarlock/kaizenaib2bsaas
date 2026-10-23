from datetime import datetime, timezone

from sqlalchemy.orm import Session

from models.task import Task
from models.user import User
from services.notifications import create_generation_notification


def refund_task_credits_once(
    db: Session,
    task: Task,
    *,
    reason: str,
    error_message: str | None = None,
    notify: bool = True,
) -> bool:
    if not task.cost or task.credits_refunded_at:
        return False

    user = db.query(User).filter(User.id == task.user_id).first()
    if not user:
        return False

    user.balance = float(user.balance or 0) + float(task.cost or 0)
    task.credits_refunded_at = datetime.now(timezone.utc)
    task.credits_refund_reason = reason

    if notify:
        create_generation_notification(
            db,
            task=task,
            kind="generation_failed",
            error_message=error_message,
            credits_refunded=True,
            dedupe=True,
        )

    return True

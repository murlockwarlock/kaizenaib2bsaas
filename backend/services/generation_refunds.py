from datetime import datetime, timezone
from decimal import Decimal

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
    if not task.cost:
        return False

    # Refunds can be triggered by both the worker and the polling endpoint.
    # Lock the task row so two concurrent failure handlers cannot credit the
    # same generation twice.
    locked_task = (
        db.query(Task)
        .filter(Task.id == task.id)
        .with_for_update()
        .first()
    )
    if not locked_task or locked_task.credits_refunded_at:
        return False

    user = (
        db.query(User)
        .filter(User.id == locked_task.user_id)
        .with_for_update()
        .first()
    )
    if not user:
        return False

    user.balance = (
        Decimal(str(user.balance or 0))
        + Decimal(str(locked_task.cost or 0))
    ).quantize(Decimal("0.0001"))
    locked_task.credits_refunded_at = datetime.now(timezone.utc)
    locked_task.credits_refund_reason = reason

    if notify:
        create_generation_notification(
            db,
            task=locked_task,
            kind="generation_failed",
            error_message=error_message,
            credits_refunded=True,
            dedupe=True,
        )

    # Flush the guard and balance update while the row locks are held. The
    # surrounding caller still controls the final commit/rollback, but a
    # concurrent refund cannot observe an unmarked task in the meantime.
    db.flush()
    return True

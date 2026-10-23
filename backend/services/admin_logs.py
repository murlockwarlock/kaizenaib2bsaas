import json
import traceback
from typing import Any

from core.database import SessionLocal
from models.admin import AdminLog


def _serialize_details(details: Any) -> str | None:
    if details is None:
        return None
    if isinstance(details, str):
        return details
    try:
        return json.dumps(details, ensure_ascii=False, default=str, indent=2)
    except Exception:
        return str(details)


def log_admin_event(
    *,
    level: str,
    scope: str,
    message: str,
    event: str | None = None,
    details: Any = None,
    path: str | None = None,
    method: str | None = None,
    task_id: int | None = None,
    user_id: int | None = None,
) -> None:
    db = SessionLocal()
    try:
        entry = AdminLog(
            level=level.upper(),
            scope=scope,
            event=event,
            message=message,
            details=_serialize_details(details),
            path=path,
            method=method,
            task_id=task_id,
            user_id=user_id,
        )
        db.add(entry)
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


def log_admin_exception(
    *,
    scope: str,
    message: str,
    exc: Exception,
    event: str | None = None,
    details: Any = None,
    path: str | None = None,
    method: str | None = None,
    task_id: int | None = None,
    user_id: int | None = None,
) -> None:
    payload = {
        "error": str(exc),
        "exception_type": exc.__class__.__name__,
        "traceback": traceback.format_exc(),
    }
    if details is not None:
        payload["context"] = details

    log_admin_event(
        level="ERROR",
        scope=scope,
        event=event,
        message=message,
        details=payload,
        path=path,
        method=method,
        task_id=task_id,
        user_id=user_id,
    )

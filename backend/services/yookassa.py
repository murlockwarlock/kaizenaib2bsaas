import base64
import json
import uuid
from typing import Any

import httpx

from core.config import settings


YOOKASSA_API_BASE = "https://api.yookassa.ru/v3"


class YooKassaError(Exception):
    pass


def _auth_header() -> str:
    raw = f"{settings.YOOKASSA_SHOP_ID}:{settings.YOOKASSA_SECRET_KEY}".encode("utf-8")
    return f"Basic {base64.b64encode(raw).decode('ascii')}"


def is_yookassa_configured() -> bool:
    return bool(settings.YOOKASSA_SHOP_ID and settings.YOOKASSA_SECRET_KEY)


async def _request(method: str, path: str, *, payload: dict[str, Any] | None = None, idempotence_key: str | None = None) -> dict[str, Any]:
    if not is_yookassa_configured():
        raise YooKassaError("YooKassa is not configured")

    headers = {
        "Authorization": _auth_header(),
        "Content-Type": "application/json",
    }
    if idempotence_key:
        headers["Idempotence-Key"] = idempotence_key

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.request(
            method,
            f"{YOOKASSA_API_BASE}{path}",
            headers=headers,
            content=json.dumps(payload) if payload is not None else None,
        )
    if response.status_code >= 400:
        raise YooKassaError(response.text)
    data = response.json()
    if not isinstance(data, dict):
        raise YooKassaError("Unexpected YooKassa response")
    return data


async def create_payment(payload: dict[str, Any]) -> dict[str, Any]:
    return await _request("POST", "/payments", payload=payload, idempotence_key=str(uuid.uuid4()))


async def get_payment(payment_id: str) -> dict[str, Any]:
    return await _request("GET", f"/payments/{payment_id}")


async def cancel_payment(payment_id: str) -> dict[str, Any]:
    return await _request("POST", f"/payments/{payment_id}/cancel", payload={}, idempotence_key=str(uuid.uuid4()))

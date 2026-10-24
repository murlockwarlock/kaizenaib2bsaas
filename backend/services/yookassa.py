import base64
import asyncio
import json
import uuid
from typing import Any

import httpx

from core.config import settings


YOOKASSA_API_BASE = "https://api.yookassa.ru/v3"


YOOKASSA_MAX_RETRIES = 3
YOOKASSA_RETRY_BACKOFF_SECONDS = 0.5


class YooKassaError(Exception):
    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        retriable: bool = False,
        uncertain: bool = False,
        payload: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.retriable = retriable
        self.uncertain = uncertain
        self.payload = payload or {}


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

    normalized_method = method.upper()
    safe_to_retry = normalized_method == "GET" or bool(idempotence_key)

    async with httpx.AsyncClient(timeout=30) as client:
        for attempt in range(YOOKASSA_MAX_RETRIES):
            try:
                response = await client.request(
                    normalized_method,
                    f"{YOOKASSA_API_BASE}{path}",
                    headers=headers,
                    content=json.dumps(payload) if payload is not None else None,
                )
            except (httpx.TimeoutException, httpx.NetworkError) as exc:
                if safe_to_retry and attempt < YOOKASSA_MAX_RETRIES - 1:
                    await asyncio.sleep(YOOKASSA_RETRY_BACKOFF_SECONDS * (2**attempt))
                    continue
                raise YooKassaError(
                    "YooKassa did not respond",
                    retriable=safe_to_retry,
                    uncertain=normalized_method != "GET",
                ) from exc

            try:
                data = response.json()
            except ValueError:
                data = {}
            if not isinstance(data, dict):
                data = {}

            if response.status_code >= 400:
                transient = response.status_code in {408, 429} or response.status_code >= 500
                if safe_to_retry and transient and attempt < YOOKASSA_MAX_RETRIES - 1:
                    await asyncio.sleep(YOOKASSA_RETRY_BACKOFF_SECONDS * (2**attempt))
                    continue
                message = (
                    data.get("description")
                    or data.get("message")
                    or response.text[:1000]
                    or f"YooKassa request failed ({response.status_code})"
                )
                raise YooKassaError(
                    message,
                    status_code=response.status_code,
                    retriable=transient,
                    uncertain=normalized_method != "GET" and transient,
                    payload=data,
                )

            if not data:
                raise YooKassaError(
                    "Unexpected YooKassa response",
                    status_code=response.status_code,
                    uncertain=normalized_method != "GET",
                )
            return data

    raise YooKassaError("YooKassa request failed", retriable=True)


async def create_payment(payload: dict[str, Any], *, idempotence_key: str | None = None) -> dict[str, Any]:
    return await _request(
        "POST",
        "/payments",
        payload=payload,
        idempotence_key=idempotence_key or str(uuid.uuid4()),
    )


async def get_payment(payment_id: str) -> dict[str, Any]:
    return await _request("GET", f"/payments/{payment_id}")


async def cancel_payment(payment_id: str) -> dict[str, Any]:
    return await _request("POST", f"/payments/{payment_id}/cancel", payload={}, idempotence_key=str(uuid.uuid4()))

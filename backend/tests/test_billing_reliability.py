import asyncio
from datetime import UTC, datetime, timedelta

import pytest


class PaymentResponse:
    def __init__(self, payload, status_code=200):
        self.payload = payload
        self.status_code = status_code
        self.text = str(payload)

    def json(self):
        return self.payload


class PaymentClient:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def request(self, method, url, **kwargs):
        self.calls.append((method, url, kwargs))
        return self.responses.pop(0)


def test_yookassa_retries_with_the_same_idempotence_key(monkeypatch):
    from services import yookassa

    client = PaymentClient([
        PaymentResponse({"type": "error", "description": "temporary"}, status_code=503),
        PaymentResponse({"id": "payment-1", "status": "pending"}),
    ])
    monkeypatch.setattr(yookassa.settings, "YOOKASSA_SHOP_ID", "shop")
    monkeypatch.setattr(yookassa.settings, "YOOKASSA_SECRET_KEY", "secret")
    monkeypatch.setattr(yookassa.httpx, "AsyncClient", lambda **kwargs: client)
    monkeypatch.setattr(yookassa, "YOOKASSA_RETRY_BACKOFF_SECONDS", 0)

    result = asyncio.run(yookassa.create_payment({"amount": {"value": "100.00"}}, idempotence_key="stable-key"))

    assert result["id"] == "payment-1"
    assert len(client.calls) == 2
    assert all(call[2]["headers"]["Idempotence-Key"] == "stable-key" for call in client.calls)


def test_yookassa_definite_client_error_is_not_marked_as_accepted(monkeypatch):
    from services import yookassa

    client = PaymentClient([
        PaymentResponse({"type": "error", "description": "Invalid request"}, status_code=400),
    ])
    monkeypatch.setattr(yookassa.settings, "YOOKASSA_SHOP_ID", "shop")
    monkeypatch.setattr(yookassa.settings, "YOOKASSA_SECRET_KEY", "secret")
    monkeypatch.setattr(yookassa.httpx, "AsyncClient", lambda **kwargs: client)

    with pytest.raises(yookassa.YooKassaError) as error:
        asyncio.run(yookassa.create_payment({"amount": {"value": "100.00"}}, idempotence_key="stable-key"))

    assert error.value.status_code == 400
    assert error.value.uncertain is False


def test_succeeded_payment_cannot_be_downgraded_by_stale_provider_state(db_session):
    from models.billing import PaymentRecord
    from models.user import User
    from services.billing import sync_payment_record

    user = User(
        email="billing@example.com",
        hashed_password="not-used",
        balance=0,
        is_verified=True,
    )
    db_session.add(user)
    db_session.flush()
    payment = PaymentRecord(
        public_id="billing-test-payment",
        provider="yookassa",
        product_type="credit_pack",
        user_id=user.id,
        pricing_plan_id=None,
        status="pending",
        original_amount=100,
        amount=100,
        credits=100,
        currency="RUB",
        expires_at=datetime.now(UTC) + timedelta(minutes=30),
    )
    db_session.add(payment)
    db_session.commit()

    sync_payment_record(
        db_session,
        payment,
        {"id": "provider-payment-1", "status": "succeeded", "captured_at": "2026-10-24T00:00:00Z"},
    )
    db_session.commit()
    sync_payment_record(db_session, payment, {"id": "provider-payment-1", "status": "canceled"})
    db_session.commit()

    db_session.refresh(user)
    db_session.refresh(payment)
    assert payment.status == "succeeded"
    assert payment.credits_granted_at is not None
    assert user.balance == 100

import secrets
import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from api.deps import get_current_active_user, get_current_superuser
from api.schemas import CheckoutCreateRequest, CheckoutQuoteRequest, PromoCodeCreate, PromoCodeUpdate, SubscriptionCancelRequest
from core.config import settings
from core.database import get_db
from models.admin import PricingPlan
from models.billing import PaymentRecord, PromoCode, Subscription
from models.user import User
from services.billing import (
    FINAL_PAYMENT_STATUSES,
    build_checkout_quote,
    build_yookassa_payload,
    calculate_credit_pack_credits,
    create_payment_record,
    get_credit_rate_per_100_rub,
    get_recurring_days,
    parse_datetime,
    PRODUCT_TYPE_CREDIT_PACK,
    PRODUCT_TYPE_PLAN,
    get_user_plan_status,
    serialize_payment,
    serialize_pricing_plan_summary,
    serialize_promo_code,
    serialize_subscription,
    sync_payment_record,
    utcnow,
)
from services.yookassa import YooKassaError, create_payment, get_payment


def require_billing_enabled():
    if not settings.BILLING_ENABLED:
        raise HTTPException(status_code=503, detail="Billing is disabled until payment access is configured")


# Do not put the feature flag on the whole router: administrators must still
# be able to inspect historical payments, plans and promo codes while new
# checkout is disabled, and webhooks must remain routable for reconciliation.
router = APIRouter()


def _get_site_base_url() -> str:
    if not settings.public_base_url:
        raise HTTPException(status_code=500, detail="BASE_URL is not configured")
    return settings.public_base_url.rstrip("/")


def _get_plan(db: Session, plan_id: int) -> PricingPlan:
    plan = db.query(PricingPlan).filter(PricingPlan.id == plan_id, PricingPlan.is_active == True).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Pricing plan not found")
    return plan


def _serialize_quote(quote: dict, plan: PricingPlan | None) -> dict:
    promo = quote["promo"]
    return {
        "purchase_type": quote["product_type"],
        "plan_id": plan.id if plan else None,
        "item_name": quote["item_name"],
        "currency": quote["currency"],
        "original_amount": quote["original_amount"],
        "discount_amount": quote["discount_amount"],
        "discount_percent": quote["discount_percent"],
        "final_amount": quote["final_amount"],
        "credits": quote["credits"],
        "credits_rate_per_100": quote.get("credits_rate_per_100", 0.0),
        "promo_code": promo.code if promo else None,
        "promo_description": promo.description if promo else None,
        "is_recurring_available": quote["is_recurring_available"],
        "recurring_days": quote["recurring_days"],
    }


def _serialize_admin_payment_rows(db: Session, payments: list[PaymentRecord]) -> list[dict]:
    user_ids = {payment.user_id for payment in payments}
    users = db.query(User).filter(User.id.in_(tuple(user_ids))).all() if user_ids else []
    user_map = {user.id: user.email for user in users}
    return [serialize_payment(payment, user_email=user_map.get(payment.user_id)) for payment in payments]


def _serialize_admin_subscription_rows(db: Session, subscriptions: list[Subscription]) -> list[dict]:
    user_ids = {subscription.user_id for subscription in subscriptions}
    users = db.query(User).filter(User.id.in_(tuple(user_ids))).all() if user_ids else []
    user_map = {user.id: user.email for user in users}
    return [serialize_subscription(subscription, user_email=user_map.get(subscription.user_id)) for subscription in subscriptions]


@router.post("/quote")
def get_checkout_quote(
    data: CheckoutQuoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    require_billing_enabled()
    try:
        plan = _get_plan(db, data.plan_id) if data.purchase_type == PRODUCT_TYPE_PLAN and data.plan_id is not None else None
        quote = build_checkout_quote(
            db,
            user=current_user,
            purchase_type=data.purchase_type,
            plan=plan,
            amount_rub=data.amount_rub,
            promo_code=data.promo_code,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _serialize_quote(quote, plan)


@router.post("/checkout")
async def create_checkout_payment(
    data: CheckoutCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    require_billing_enabled()
    if not (settings.YOOKASSA_SHOP_ID and settings.YOOKASSA_SECRET_KEY):
        raise HTTPException(status_code=500, detail="YooKassa is not configured")

    locale = "en" if data.locale == "en" else "ru"
    try:
        plan = _get_plan(db, data.plan_id) if data.purchase_type == PRODUCT_TYPE_PLAN and data.plan_id is not None else None
        quote = build_checkout_quote(
            db,
            user=current_user,
            purchase_type=data.purchase_type,
            plan=plan,
            amount_rub=data.amount_rub,
            promo_code=data.promo_code,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    expires_at = utcnow() + timedelta(minutes=30)
    base_url = _get_site_base_url()

    payment = create_payment_record(
        db,
        user=current_user,
        plan=plan,
        quote=quote,
        return_url="",
        expires_at=expires_at,
        recurring_opt_in=bool(data.enable_recurring and plan and plan.is_recurring),
    )
    return_url = f"{base_url}/{locale}/pricing/checkout/success?payment={payment.public_id}"
    payment.return_url = return_url
    checkout_url = f"/pricing/checkout?payment={payment.public_id}"
    payload = build_yookassa_payload(
        payment=payment,
        return_url=return_url,
        save_payment_method=payment.save_payment_method,
    )

    try:
        provider_payment = await create_payment(payload, idempotence_key=payment.idempotence_key)
    except YooKassaError as exc:
        if exc.uncertain:
            payment.status = "pending"
            payment.provider_status = "provider_confirmation_pending"
            db.commit()
            raise HTTPException(
                status_code=502,
                detail="Payment creation is still being confirmed. Please refresh this payment shortly.",
            ) from exc
        payment.status = "failed"
        payment.provider_status = "provider_request_failed"
        db.commit()
        raise HTTPException(status_code=502, detail="Failed to create YooKassa payment") from exc

    sync_payment_record(db, payment, provider_payment)
    db.commit()
    db.refresh(payment)

    return {
        "payment": serialize_payment(payment),
        "checkout_url": checkout_url,
    }


@router.get("/payments/{public_id}")
def get_checkout_payment(
    public_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    payment = db.query(PaymentRecord).filter(PaymentRecord.public_id == public_id, PaymentRecord.user_id == current_user.id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return serialize_payment(payment)


@router.post("/payments/{public_id}/refresh")
async def refresh_checkout_payment(
    public_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    payment = db.query(PaymentRecord).filter(PaymentRecord.public_id == public_id, PaymentRecord.user_id == current_user.id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment.provider_payment_id and payment.status not in FINAL_PAYMENT_STATUSES:
        try:
            provider_payment = await get_payment(payment.provider_payment_id)
            sync_payment_record(db, payment, provider_payment)
            db.commit()
            db.refresh(payment)
        except YooKassaError as exc:
            if exc.uncertain:
                payment.provider_status = "provider_confirmation_pending"
                db.commit()
            raise HTTPException(status_code=502, detail="Failed to refresh payment state; the provider may still be processing it") from exc

    if payment.status == "pending" and payment.expires_at and utcnow() > payment.expires_at:
        payment.status = "expired"
        db.commit()
        db.refresh(payment)

    return serialize_payment(payment)


@router.get("/payments")
def list_my_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    payments = (
        db.query(PaymentRecord)
        .filter(PaymentRecord.user_id == current_user.id)
        .order_by(PaymentRecord.created_at.desc())
        .limit(50)
        .all()
    )
    return [serialize_payment(payment) for payment in payments]


@router.get("/me/plan")
def get_my_plan_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return get_user_plan_status(db, user_id=current_user.id)


@router.post("/subscriptions/{public_id}/cancel")
def cancel_subscription(
    public_id: str,
    data: SubscriptionCancelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    subscription = db.query(Subscription).filter(Subscription.public_id == public_id, Subscription.user_id == current_user.id).first()
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    subscription.cancel_at_period_end = not data.cancel_now
    if data.cancel_now:
        subscription.status = "canceled"
        subscription.canceled_at = utcnow()

    db.commit()
    db.refresh(subscription)
    return serialize_subscription(subscription)


@router.post("/yookassa/webhook/{token}")
async def yookassa_webhook(
    token: str,
    request: Request,
    db: Session = Depends(get_db),
):
    if not settings.YOOKASSA_WEBHOOK_TOKEN or not secrets.compare_digest(token, settings.YOOKASSA_WEBHOOK_TOKEN):
        raise HTTPException(status_code=403, detail="Invalid webhook token")

    body = await request.json()
    payment_object = body.get("object") if isinstance(body, dict) else None
    if not isinstance(payment_object, dict):
        return {"status": "ignored"}

    provider_payment_id = payment_object.get("id")
    if not provider_payment_id:
        return {"status": "ignored"}

    payment = db.query(PaymentRecord).filter(PaymentRecord.provider_payment_id == str(provider_payment_id)).first()
    if not payment:
        metadata = payment_object.get("metadata") or {}
        public_id = metadata.get("payment_public_id")
        if public_id:
            payment = db.query(PaymentRecord).filter(PaymentRecord.public_id == str(public_id)).first()
    if not payment:
        return {"status": "ignored"}

    sync_payment_record(db, payment, payment_object)
    db.commit()
    return {"status": "ok"}


@router.get("/admin/payments")
def get_admin_payments(
    user_email: str | None = Query(default=None),
    status: str | None = Query(default=None),
    plan_id: int | None = Query(default=None),
    utm_code: str | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    query = db.query(PaymentRecord).join(User, User.id == PaymentRecord.user_id)
    if user_email:
        query = query.filter(User.email.ilike(f"%{user_email.strip()}%"))
    if status:
        query = query.filter(PaymentRecord.status == status)
    if plan_id is not None:
        query = query.filter(PaymentRecord.pricing_plan_id == plan_id)
    if utm_code:
        query = query.filter(User.utm_code == utm_code.strip().lower())
    parsed_date_from = parse_datetime(date_from)
    parsed_date_to = parse_datetime(date_to)
    if parsed_date_from:
        query = query.filter(PaymentRecord.created_at >= parsed_date_from)
    if parsed_date_to:
        query = query.filter(PaymentRecord.created_at <= parsed_date_to)

    payments = query.order_by(PaymentRecord.created_at.desc()).limit(limit).all()
    return _serialize_admin_payment_rows(db, payments)


@router.get("/admin/promocodes")
def get_admin_promocodes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    promos = db.query(PromoCode).order_by(PromoCode.created_at.desc()).all()
    result = []
    for promo in promos:
        total_uses = db.query(PaymentRecord).filter(PaymentRecord.promo_code_id == promo.id, PaymentRecord.status == "succeeded").count()
        active_reservations = db.query(PaymentRecord).filter(PaymentRecord.promo_code_id == promo.id, PaymentRecord.status == "pending").count()
        result.append(serialize_promo_code(promo, total_uses=total_uses, active_reservations=active_reservations))
    return result


@router.post("/admin/promocodes")
def create_admin_promocode(
    data: PromoCodeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    existing = db.query(PromoCode).filter(PromoCode.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Promo code already exists")

    promo = PromoCode(
        code=data.code,
        description=data.description,
        discount_percent=data.discount_percent,
        max_total_uses=data.max_total_uses,
        max_uses_per_user=max(int(data.max_uses_per_user or 1), 1),
        is_active=data.is_active,
        valid_from=parse_datetime(data.valid_from),
        valid_until=parse_datetime(data.valid_until),
    )
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return serialize_promo_code(promo, total_uses=0, active_reservations=0)


@router.put("/admin/promocodes/{promo_id}")
def update_admin_promocode(
    promo_id: int,
    data: PromoCodeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    promo = db.query(PromoCode).filter(PromoCode.id == promo_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")

    payload = data.model_dump(exclude_unset=True)
    if "valid_from" in payload:
        payload["valid_from"] = parse_datetime(payload["valid_from"])
    if "valid_until" in payload:
        payload["valid_until"] = parse_datetime(payload["valid_until"])
    if "max_uses_per_user" in payload and payload["max_uses_per_user"] is not None:
        payload["max_uses_per_user"] = max(int(payload["max_uses_per_user"]), 1)

    for key, value in payload.items():
        setattr(promo, key, value)

    db.commit()
    db.refresh(promo)
    total_uses = db.query(PaymentRecord).filter(PaymentRecord.promo_code_id == promo.id, PaymentRecord.status == "succeeded").count()
    active_reservations = db.query(PaymentRecord).filter(PaymentRecord.promo_code_id == promo.id, PaymentRecord.status == "pending").count()
    return serialize_promo_code(promo, total_uses=total_uses, active_reservations=active_reservations)


@router.delete("/admin/promocodes/{promo_id}")
def delete_admin_promocode(
    promo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    promo = db.query(PromoCode).filter(PromoCode.id == promo_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")
    db.delete(promo)
    db.commit()
    return {"status": "success"}


@router.get("/admin/subscriptions")
def get_admin_subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    subscriptions = db.query(Subscription).order_by(Subscription.created_at.desc()).limit(200).all()
    return _serialize_admin_subscription_rows(db, subscriptions)


@router.post("/admin/subscriptions/process-due")
async def process_due_subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    require_billing_enabled()
    due_subscriptions = (
        db.query(Subscription)
        .filter(
            Subscription.status.in_(("active", "past_due")),
            Subscription.cancel_at_period_end == False,
            Subscription.next_charge_at <= utcnow(),
        )
        .all()
    )

    processed = []
    for subscription in due_subscriptions:
        plan = _get_plan(db, subscription.pricing_plan_id)
        user = db.query(User).filter(User.id == subscription.user_id).first()
        if not user:
            continue

        payment = PaymentRecord(
            public_id=uuid.uuid4().hex,
            provider="yookassa",
            user_id=user.id,
            pricing_plan_id=plan.id,
            product_type=PRODUCT_TYPE_PLAN,
            status="pending",
            original_amount=subscription.amount,
            amount=subscription.amount,
            discount_amount=0.0,
            discount_percent=0.0,
            credits_rate_per_100_snapshot=0.0,
            currency=subscription.currency,
            credits=subscription.credits,
            description=f"Recurring charge: {plan.name_ru or plan.name_en or 'KaizenAI'}",
            return_url="",
            expires_at=utcnow() + timedelta(minutes=30),
            save_payment_method=False,
            recurring_opt_in=True,
            payment_method_id=subscription.payment_method_id,
            payment_method_type=subscription.payment_method_type,
            idempotence_key=uuid.uuid4().hex,
        )
        db.add(payment)
        db.flush()

        payload = build_yookassa_payload(
            payment=payment,
            return_url="",
            save_payment_method=False,
            payment_method_id=subscription.payment_method_id,
        )
        try:
            provider_payment = await create_payment(payload, idempotence_key=payment.idempotence_key)
            sync_payment_record(db, payment, provider_payment)
            subscription.last_payment_id = payment.id
            if payment.status == "succeeded":
                subscription.status = "active"
                subscription.next_charge_at = utcnow() + timedelta(days=subscription.interval_days)
                subscription.last_error = None
            else:
                subscription.status = "past_due"
                subscription.next_charge_at = utcnow() + timedelta(days=1)
                subscription.last_error = payment.provider_status or payment.status
        except YooKassaError as exc:
            payment.status = "pending" if exc.uncertain else "failed"
            payment.provider_status = "provider_confirmation_pending" if exc.uncertain else "provider_request_failed"
            subscription.status = "past_due"
            subscription.last_error = str(exc)
            subscription.next_charge_at = utcnow() + timedelta(days=1)
        processed.append({"subscription_id": subscription.id, "status": subscription.status, "last_error": subscription.last_error})

    db.commit()
    return {"processed": processed, "count": len(processed)}

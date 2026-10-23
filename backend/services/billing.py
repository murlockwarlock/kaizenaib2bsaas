import json
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from sqlalchemy.orm import Session

from core.config import settings
from models.admin import PricingPlan, SiteSetting
from models.billing import PaymentRecord, PlanAccessGrant, PromoCode, Subscription
from models.user import User


ACTIVE_PAYMENT_STATUSES = {"pending", "succeeded", "waiting_for_capture"}
FINAL_PAYMENT_STATUSES = {"succeeded", "canceled", "expired", "failed"}
PRODUCT_TYPE_PLAN = "plan"
PRODUCT_TYPE_CREDIT_PACK = "credit_pack"


def utcnow() -> datetime:
    return datetime.now(UTC)


def round_money(value: float | Decimal) -> float:
    decimal_value = Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return float(decimal_value)


def money_string(value: float | Decimal) -> str:
    return f"{Decimal(str(value)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)}"


def normalize_promo_code(code: str | None) -> str | None:
    if not code:
        return None
    normalized = code.strip().upper()
    return normalized or None


def parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def get_site_setting(db: Session, key: str, default: str) -> str:
    setting = db.query(SiteSetting).filter(SiteSetting.key == key).first()
    return setting.value if setting and setting.value not in (None, "") else default


def get_min_amount(db: Session) -> float:
    raw_value = get_site_setting(db, "billing_min_amount_rub", str(settings.BILLING_MIN_AMOUNT_RUB))
    try:
        return max(round_money(float(raw_value)), 0.0)
    except (TypeError, ValueError):
        return settings.BILLING_MIN_AMOUNT_RUB


def get_credit_rate_per_100_rub(db: Session) -> float:
    raw_value = get_site_setting(db, "credits_per_100_rub", "100")
    try:
        return max(round_money(float(raw_value)), 1.0)
    except (TypeError, ValueError):
        return 100.0


def get_recurring_days(plan: PricingPlan) -> int:
    return max(int(plan.recurring_days or 30), 1)


def calculate_credit_pack_credits(amount_rub: float | Decimal, credits_per_100_rub: float | Decimal) -> int:
    credits = Decimal(str(amount_rub)) * Decimal(str(credits_per_100_rub)) / Decimal("100")
    return max(int(credits.quantize(Decimal("1"), rounding=ROUND_HALF_UP)), 0)


def validate_promo_code(db: Session, *, code: str | None, user: User, now: datetime | None = None) -> PromoCode | None:
    normalized = normalize_promo_code(code)
    if not normalized:
        return None

    promo = db.query(PromoCode).filter(PromoCode.code == normalized).first()
    if not promo or not promo.is_active:
        raise ValueError("Promo code not found or inactive")

    current_time = now or utcnow()
    if promo.valid_from and current_time < promo.valid_from.astimezone(UTC):
        raise ValueError("Promo code is not active yet")
    if promo.valid_until and current_time > promo.valid_until.astimezone(UTC):
        raise ValueError("Promo code has expired")

    successful_uses = db.query(PaymentRecord).filter(
        PaymentRecord.promo_code_id == promo.id,
        PaymentRecord.status == "succeeded",
    ).count()
    if promo.max_total_uses is not None and successful_uses >= promo.max_total_uses:
        raise ValueError("Promo code usage limit reached")

    user_uses = db.query(PaymentRecord).filter(
        PaymentRecord.user_id == user.id,
        PaymentRecord.promo_code_id == promo.id,
        PaymentRecord.status.in_(tuple(ACTIVE_PAYMENT_STATUSES)),
    ).count()
    if user_uses >= max(int(promo.max_uses_per_user or 1), 1):
        raise ValueError("Promo code already used on this account")

    return promo


def build_checkout_quote(
    db: Session,
    *,
    user: User,
    purchase_type: str,
    plan: PricingPlan | None,
    amount_rub: float | None,
    promo_code: str | None,
) -> dict[str, Any]:
    min_amount = get_min_amount(db)
    promo = validate_promo_code(db, code=promo_code, user=user)
    discount_percent = round_money(promo.discount_percent) if promo else 0.0

    if purchase_type == PRODUCT_TYPE_CREDIT_PACK:
        original_amount = round_money(amount_rub or 0)
        if original_amount <= 0:
            raise ValueError("Credit top-up amount must be greater than 0")
        credits_rate_per_100 = get_credit_rate_per_100_rub(db)
        credits = calculate_credit_pack_credits(original_amount, credits_rate_per_100)
        if credits <= 0:
            raise ValueError("Credit amount is too small")
        item_name = f"Credit top-up ({credits} credits)"
        description = item_name
        recurring_available = False
        recurring_days = 0
    else:
        if not plan:
            raise ValueError("Pricing plan is required")
        original_amount = round_money(plan.price)
        if original_amount <= 0:
            raise ValueError("This plan does not require payment")
        credits_rate_per_100 = 0.0
        credits = max(int(plan.credits or 0), 0)
        if credits <= 0:
            raise ValueError("This plan does not provide credits")
        item_name = plan.name_ru or plan.name_en or "Globus AI plan"
        description = f"{item_name} ({credits} credits)"
        recurring_available = bool(plan.is_recurring)
        recurring_days = get_recurring_days(plan)

    discount_amount = round_money(original_amount * discount_percent / 100) if promo else 0.0
    final_amount = round_money(max(original_amount - discount_amount, 0))

    if final_amount < min_amount:
        raise ValueError(f"Minimum payment amount is {money_string(min_amount)} {settings.YOOKASSA_CURRENCY}")

    return {
        "product_type": purchase_type,
        "plan": plan,
        "promo": promo,
        "item_name": item_name,
        "description": description,
        "original_amount": original_amount,
        "discount_percent": discount_percent,
        "discount_amount": discount_amount,
        "final_amount": final_amount,
        "currency": settings.YOOKASSA_CURRENCY,
        "credits": credits,
        "credits_rate_per_100": credits_rate_per_100,
        "min_amount": min_amount,
        "is_recurring_available": recurring_available,
        "recurring_days": recurring_days,
    }


def serialize_payment(payment: PaymentRecord, *, user_email: str | None = None) -> dict[str, Any]:
    return {
        "id": payment.id,
        "public_id": payment.public_id,
        "user_id": payment.user_id,
        "user_email": user_email,
        "product_type": payment.product_type or PRODUCT_TYPE_PLAN,
        "pricing_plan_id": payment.pricing_plan_id if payment.pricing_plan_id and payment.pricing_plan_id > 0 else None,
        "provider": payment.provider,
        "provider_payment_id": payment.provider_payment_id,
        "provider_status": payment.provider_status,
        "status": payment.status,
        "original_amount": payment.original_amount,
        "amount": payment.amount,
        "discount_amount": payment.discount_amount,
        "discount_percent": payment.discount_percent,
        "credits_rate_per_100": payment.credits_rate_per_100_snapshot,
        "currency": payment.currency,
        "credits": payment.credits,
        "description": payment.description,
        "confirmation_url": payment.confirmation_url,
        "return_url": payment.return_url,
        "expires_at": payment.expires_at.isoformat() if payment.expires_at else None,
        "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
        "canceled_at": payment.canceled_at.isoformat() if payment.canceled_at else None,
        "promo_code": payment.promo_code_snapshot,
        "save_payment_method": payment.save_payment_method,
        "recurring_opt_in": payment.recurring_opt_in,
        "payment_method_id": payment.payment_method_id,
        "payment_method_type": payment.payment_method_type,
        "created_at": payment.created_at.isoformat() if payment.created_at else None,
    }


def serialize_subscription(subscription: Subscription, *, user_email: str | None = None) -> dict[str, Any]:
    return {
        "id": subscription.id,
        "public_id": subscription.public_id,
        "user_id": subscription.user_id,
        "user_email": user_email,
        "pricing_plan_id": subscription.pricing_plan_id,
        "status": subscription.status,
        "amount": subscription.amount,
        "currency": subscription.currency,
        "credits": subscription.credits,
        "interval_days": subscription.interval_days,
        "payment_method_id": subscription.payment_method_id,
        "payment_method_type": subscription.payment_method_type,
        "cancel_at_period_end": subscription.cancel_at_period_end,
        "next_charge_at": subscription.next_charge_at.isoformat() if subscription.next_charge_at else None,
        "last_payment_id": subscription.last_payment_id,
        "last_error": subscription.last_error,
        "canceled_at": subscription.canceled_at.isoformat() if subscription.canceled_at else None,
        "created_at": subscription.created_at.isoformat() if subscription.created_at else None,
    }


def serialize_pricing_plan_summary(plan: PricingPlan) -> dict[str, Any]:
    return {
        "id": plan.id,
        "name_ru": plan.name_ru,
        "name_en": plan.name_en,
        "badge_ru": plan.badge_ru,
        "badge_en": plan.badge_en,
        "price": plan.price,
        "credits": plan.credits,
        "currency_symbol": plan.currency_symbol,
        "is_recurring": bool(plan.is_recurring),
        "recurring_days": get_recurring_days(plan),
        "is_featured": bool(plan.is_featured),
    }


def get_user_plan_status(db: Session, *, user_id: int) -> dict[str, Any]:
    active_subscription = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == user_id,
            Subscription.status.in_(("active", "past_due")),
        )
        .order_by(Subscription.created_at.desc())
        .first()
    )

    current_plan: PricingPlan | None = None
    if active_subscription:
        current_plan = db.query(PricingPlan).filter(PricingPlan.id == active_subscription.pricing_plan_id).first()

    if current_plan is None:
        latest_plan_payment = (
            db.query(PaymentRecord)
            .filter(
                PaymentRecord.user_id == user_id,
                PaymentRecord.product_type == PRODUCT_TYPE_PLAN,
                PaymentRecord.status == "succeeded",
                PaymentRecord.pricing_plan_id > 0,
            )
            .order_by(PaymentRecord.paid_at.desc(), PaymentRecord.created_at.desc())
            .first()
        )
        if latest_plan_payment:
            current_plan = db.query(PricingPlan).filter(PricingPlan.id == latest_plan_payment.pricing_plan_id).first()

    if current_plan is None:
        active_grant = (
            db.query(PlanAccessGrant)
            .filter(
                PlanAccessGrant.user_id == user_id,
                PlanAccessGrant.is_active == True,
            )
            .order_by(PlanAccessGrant.granted_at.desc(), PlanAccessGrant.id.desc())
            .all()
        )
        for grant in active_grant:
            if grant.expires_at and grant.expires_at.astimezone(UTC) <= utcnow():
                continue
            current_plan = db.query(PricingPlan).filter(PricingPlan.id == grant.pricing_plan_id).first()
            if current_plan:
                break

    next_plan: PricingPlan | None = None
    if current_plan:
        next_plan = (
            db.query(PricingPlan)
            .filter(
                PricingPlan.is_active == True,
                PricingPlan.price > current_plan.price,
            )
            .order_by(PricingPlan.price.asc(), PricingPlan.sort_order.asc(), PricingPlan.id.asc())
            .first()
        )

    return {
        "current_plan": serialize_pricing_plan_summary(current_plan) if current_plan else None,
        "next_plan": serialize_pricing_plan_summary(next_plan) if next_plan else None,
        "active_subscription": serialize_subscription(active_subscription) if active_subscription else None,
    }


def serialize_promo_code(promo: PromoCode, *, total_uses: int, active_reservations: int) -> dict[str, Any]:
    return {
        "id": promo.id,
        "code": promo.code,
        "description": promo.description,
        "discount_percent": promo.discount_percent,
        "max_total_uses": promo.max_total_uses,
        "max_uses_per_user": promo.max_uses_per_user,
        "is_active": promo.is_active,
        "valid_from": promo.valid_from.isoformat() if promo.valid_from else None,
        "valid_until": promo.valid_until.isoformat() if promo.valid_until else None,
        "total_uses": total_uses,
        "active_reservations": active_reservations,
        "created_at": promo.created_at.isoformat() if promo.created_at else None,
    }


def build_yookassa_payload(
    *,
    payment: PaymentRecord,
    return_url: str,
    save_payment_method: bool,
    payment_method_id: str | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "amount": {
            "value": money_string(payment.amount),
            "currency": payment.currency,
        },
        "capture": True,
        "description": payment.description,
        "metadata": {
            "payment_public_id": payment.public_id,
            "user_id": str(payment.user_id),
            "product_type": payment.product_type or PRODUCT_TYPE_PLAN,
        },
    }
    if payment.pricing_plan_id and payment.pricing_plan_id > 0:
        payload["metadata"]["plan_id"] = str(payment.pricing_plan_id)
    if payment.promo_code_snapshot:
        payload["metadata"]["promo_code"] = payment.promo_code_snapshot

    if payment_method_id:
        payload["payment_method_id"] = payment_method_id
    else:
        payload["confirmation"] = {
            "type": "redirect",
            "return_url": return_url,
        }

    if save_payment_method:
        payload["save_payment_method"] = True

    return payload


def _mark_credits_granted(db: Session, payment: PaymentRecord, user: User) -> None:
    if payment.credits_granted_at:
        return
    user.balance = round_money((user.balance or 0) + payment.credits)
    payment.credits_granted_at = utcnow()


def _upsert_subscription(db: Session, payment: PaymentRecord) -> None:
    if not (
        payment.product_type == PRODUCT_TYPE_PLAN
        and payment.recurring_opt_in
        and payment.payment_method_id
        and payment.status == "succeeded"
    ):
        return

    plan = db.query(PricingPlan).filter(PricingPlan.id == payment.pricing_plan_id).first()
    if not plan or not plan.is_recurring:
        return

    subscription = db.query(Subscription).filter(
        Subscription.user_id == payment.user_id,
        Subscription.pricing_plan_id == payment.pricing_plan_id,
        Subscription.status.in_(("active", "past_due")),
    ).first()

    next_charge_at = utcnow() + timedelta(days=get_recurring_days(plan))
    if subscription:
        subscription.status = "active"
        subscription.amount = payment.amount
        subscription.currency = payment.currency
        subscription.credits = payment.credits
        subscription.interval_days = get_recurring_days(plan)
        subscription.payment_method_id = payment.payment_method_id
        subscription.payment_method_type = payment.payment_method_type
        subscription.cancel_at_period_end = False
        subscription.next_charge_at = next_charge_at
        subscription.last_payment_id = payment.id
        subscription.last_error = None
        subscription.canceled_at = None
        return

    db.add(
        Subscription(
            public_id=uuid.uuid4().hex,
            user_id=payment.user_id,
            pricing_plan_id=payment.pricing_plan_id,
            status="active",
            amount=payment.amount,
            currency=payment.currency,
            credits=payment.credits,
            interval_days=get_recurring_days(plan),
            payment_method_id=payment.payment_method_id,
            payment_method_type=payment.payment_method_type,
            next_charge_at=next_charge_at,
            last_payment_id=payment.id,
        )
    )


def sync_payment_record(db: Session, payment: PaymentRecord, provider_data: dict[str, Any]) -> PaymentRecord:
    payment.provider_status = str(provider_data.get("status") or payment.provider_status or "")
    payment.provider_payload_json = json.dumps(provider_data, ensure_ascii=True)
    payment.provider_payment_id = str(provider_data.get("id") or payment.provider_payment_id or "")

    confirmation = provider_data.get("confirmation") or {}
    confirmation_url = confirmation.get("confirmation_url")
    if confirmation_url:
        payment.confirmation_url = confirmation_url

    payment_method = provider_data.get("payment_method") or {}
    payment_method_id = payment_method.get("id")
    if payment_method_id:
        payment.payment_method_id = payment_method_id
    payment_method_type = payment_method.get("type")
    if payment_method_type:
        payment.payment_method_type = payment_method_type

    status = str(provider_data.get("status") or payment.status)
    if status == "succeeded":
        payment.status = "succeeded"
        payment.paid_at = parse_datetime(provider_data.get("captured_at") or provider_data.get("paid_at")) or utcnow()
        user = db.query(User).filter(User.id == payment.user_id).first()
        if user:
            _mark_credits_granted(db, payment, user)
        _upsert_subscription(db, payment)
    elif status == "canceled":
        payment.status = "canceled"
        payment.canceled_at = utcnow()
    elif status == "waiting_for_capture":
        payment.status = "waiting_for_capture"
    else:
        payment.status = "pending"
        if payment.status != "succeeded" and payment.expires_at and utcnow() > payment.expires_at:
            payment.status = "expired"
            payment.canceled_at = utcnow()

    db.flush()
    return payment


def create_payment_record(
    db: Session,
    *,
    user: User,
    plan: PricingPlan | None,
    quote: dict[str, Any],
    return_url: str,
    expires_at: datetime,
    recurring_opt_in: bool,
) -> PaymentRecord:
    payment = PaymentRecord(
        public_id=uuid.uuid4().hex,
        provider="yookassa",
        product_type=quote["product_type"],
        user_id=user.id,
        pricing_plan_id=plan.id if plan else 0,
        promo_code_id=quote["promo"].id if quote["promo"] else None,
        promo_code_snapshot=quote["promo"].code if quote["promo"] else None,
        status="pending",
        original_amount=quote["original_amount"],
        amount=quote["final_amount"],
        discount_amount=quote["discount_amount"],
        discount_percent=quote["discount_percent"],
        credits_rate_per_100_snapshot=quote.get("credits_rate_per_100", 0.0),
        currency=quote["currency"],
        credits=quote["credits"],
        description=quote["description"],
        return_url=return_url,
        expires_at=expires_at,
        save_payment_method=recurring_opt_in and bool(plan and plan.is_recurring),
        recurring_opt_in=recurring_opt_in and bool(plan and plan.is_recurring),
    )
    db.add(payment)
    db.flush()
    return payment

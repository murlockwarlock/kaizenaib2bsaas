from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from core.database import Base


class PromoCode(Base):
    __tablename__ = "promo_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    discount_percent = Column(Float, nullable=False, default=0.0)
    max_total_uses = Column(Integer, nullable=True)
    max_uses_per_user = Column(Integer, nullable=False, default=1)
    is_active = Column(Boolean, default=True)
    valid_from = Column(DateTime(timezone=True), nullable=True)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PaymentRecord(Base):
    __tablename__ = "payment_records"

    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String, unique=True, index=True, nullable=False)
    provider = Column(String, nullable=False, default="yookassa")
    product_type = Column(String, nullable=False, default="plan")
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    pricing_plan_id = Column(Integer, ForeignKey("pricing_plans.id"), index=True, nullable=False)
    promo_code_id = Column(Integer, ForeignKey("promo_codes.id"), index=True, nullable=True)
    promo_code_snapshot = Column(String, nullable=True)
    provider_payment_id = Column(String, unique=True, index=True, nullable=True)
    provider_status = Column(String, nullable=True)
    status = Column(String, index=True, nullable=False, default="pending")
    original_amount = Column(Float, nullable=False, default=0.0)
    amount = Column(Float, nullable=False, default=0.0)
    discount_amount = Column(Float, nullable=False, default=0.0)
    discount_percent = Column(Float, nullable=False, default=0.0)
    credits_rate_per_100_snapshot = Column(Float, nullable=False, default=0.0)
    currency = Column(String, nullable=False, default="RUB")
    credits = Column(Integer, nullable=False, default=0)
    description = Column(String, nullable=True)
    confirmation_url = Column(Text, nullable=True)
    return_url = Column(Text, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    canceled_at = Column(DateTime(timezone=True), nullable=True)
    credits_granted_at = Column(DateTime(timezone=True), nullable=True)
    save_payment_method = Column(Boolean, default=False)
    recurring_opt_in = Column(Boolean, default=False)
    payment_method_id = Column(String, nullable=True)
    payment_method_type = Column(String, nullable=True)
    provider_payload_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    pricing_plan_id = Column(Integer, ForeignKey("pricing_plans.id"), index=True, nullable=False)
    status = Column(String, index=True, nullable=False, default="active")
    amount = Column(Float, nullable=False, default=0.0)
    currency = Column(String, nullable=False, default="RUB")
    credits = Column(Integer, nullable=False, default=0)
    interval_days = Column(Integer, nullable=False, default=30)
    payment_method_id = Column(String, nullable=False)
    payment_method_type = Column(String, nullable=True)
    cancel_at_period_end = Column(Boolean, default=False)
    next_charge_at = Column(DateTime(timezone=True), nullable=False)
    last_payment_id = Column(Integer, ForeignKey("payment_records.id"), nullable=True)
    last_error = Column(Text, nullable=True)
    canceled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PlanInvite(Base):
    __tablename__ = "plan_invites"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    token_hash = Column(String, unique=True, index=True, nullable=False)
    pricing_plan_id = Column(Integer, ForeignKey("pricing_plans.id"), index=True, nullable=False)
    status = Column(String, index=True, nullable=False, default="pending")
    error_message = Column(Text, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    used_at = Column(DateTime(timezone=True), nullable=True)
    used_by_user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PlanAccessGrant(Base):
    __tablename__ = "plan_access_grants"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    pricing_plan_id = Column(Integer, ForeignKey("pricing_plans.id"), index=True, nullable=False)
    source_invite_id = Column(Integer, ForeignKey("plan_invites.id"), index=True, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    granted_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)


class UTMTrackingLink(Base):
    __tablename__ = "utm_tracking_links"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    utm_source = Column(String, index=True, nullable=False)
    utm_medium = Column(String, nullable=False, default="creator")
    utm_campaign = Column(String, nullable=False, default="bloggers")
    target_path = Column(String, nullable=False, default="/ru/register")
    note = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_by_user_id = Column(Integer, index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

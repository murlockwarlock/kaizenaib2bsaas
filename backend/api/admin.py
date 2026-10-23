import hashlib
import logging
import secrets
import smtplib
from datetime import UTC, datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Body, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any

from core.database import get_db
from models.user import User
from models.task import Task
from models.admin import Promotion, Banner, FAQ, GenerationExample, SiteSetting, Feedback, ModelPricing, FeaturedAudio, PricingPlan, AdminLog
from models.billing import PaymentRecord, PlanAccessGrant, PlanInvite, Subscription, UTMTrackingLink
from api.deps import get_current_superuser
from api.schemas import PromotionCreate, FAQCreate, ExampleCreate, ExampleUpdate, PricingCreate, PricingUpdate, PricingPlanCreate, PricingPlanUpdate, SettingsUpdate, PlanInviteBulkCreate, UTMTrackingLinkCreate
from core.config import settings
from core.upload_security import save_validated_image_upload, save_validated_upload
from services.kie_ai import get_kie_remaining_credits_sync
from services.billing import PRODUCT_TYPE_PLAN, round_money

router = APIRouter()
logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _hash_invite_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _build_claim_url(token: str) -> str:
    base = settings.public_base_url or "http://localhost:3000"
    return f"{base.rstrip('/')}/claim?token={token}"


def _build_tracking_url(link: UTMTrackingLink) -> str:
    base = (settings.public_base_url or "http://localhost:3000").rstrip("/")
    path = (link.target_path or "/ru/register").strip() or "/ru/register"
    if not path.startswith("/"):
        path = f"/{path}"
    query = urlencode(
        {
            "utm_code": link.code,
            "utm_source": link.utm_source,
            "utm_medium": link.utm_medium,
            "utm_campaign": link.utm_campaign,
        }
    )
    return f"{base}{path}?{query}"


def _send_plan_invite_email(email: str, *, plan_name: str, claim_url: str, expires_at: datetime | None):
    if not settings.SMTP_EMAIL or not settings.SMTP_PASSWORD:
        logger.info("[DEV] Plan invite for %s (%s): %s", email, plan_name, claim_url)
        return

    msg = MIMEMultipart()
    msg["From"] = settings.SMTP_EMAIL
    msg["To"] = email
    msg["Subject"] = f"Globus AI — access to {plan_name}"

    expiry_copy = ""
    if expires_at:
        expiry_copy = f"<p style=\"color:#71717a;font-size:12px;margin:18px 0 0;text-align:center;\">The link expires on {expires_at.strftime('%Y-%m-%d %H:%M UTC')}.</p>"

    body = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#09090b;border-radius:16px;color:#fff;">
      <h2 style="margin:0 0 10px;font-size:22px;">Your access is ready</h2>
      <p style="color:#a1a1aa;margin:0 0 22px;font-size:14px;">Use this one-time link to activate access for <strong>{plan_name}</strong> on the same email address.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="{claim_url}" style="display:inline-block;padding:14px 24px;border-radius:12px;background:#8b5cf6;color:#fff;text-decoration:none;font-weight:700;">Activate access</a>
      </div>
      <p style="color:#71717a;font-size:12px;margin:20px 0 0;text-align:center;">This link can be used only once.</p>
      {expiry_copy}
    </div>
    """
    msg.attach(MIMEText(body, "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(settings.SMTP_EMAIL, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_EMAIL, email, msg.as_string())


def _serialize_plan_invite(invite: PlanInvite, *, plan: PricingPlan | None, used_by_email: str | None = None) -> dict:
    return {
        "id": invite.id,
        "email": invite.email,
        "pricing_plan_id": invite.pricing_plan_id,
        "plan_name_ru": plan.name_ru if plan else None,
        "plan_name_en": plan.name_en if plan else None,
        "status": invite.status,
        "error_message": invite.error_message,
        "expires_at": invite.expires_at.isoformat() if invite.expires_at else None,
        "sent_at": invite.sent_at.isoformat() if invite.sent_at else None,
        "used_at": invite.used_at.isoformat() if invite.used_at else None,
        "used_by_user_id": invite.used_by_user_id,
        "used_by_email": used_by_email,
        "created_at": invite.created_at.isoformat() if invite.created_at else None,
    }


def _create_plan_invite(
    *,
    db: Session,
    email: str,
    plan: PricingPlan,
    expires_at: datetime | None,
) -> tuple[PlanInvite, str]:
    normalized_email = str(email).strip().lower()
    pending_invites = (
        db.query(PlanInvite)
        .filter(
            PlanInvite.email == normalized_email,
            PlanInvite.status.in_(("pending", "sent", "failed")),
            PlanInvite.used_at.is_(None),
        )
        .all()
    )
    for existing in pending_invites:
        existing.status = "revoked"

    token = secrets.token_urlsafe(32)
    invite = PlanInvite(
        email=normalized_email,
        token_hash=_hash_invite_token(token),
        pricing_plan_id=plan.id,
        status="pending",
        expires_at=expires_at,
    )
    db.add(invite)
    db.flush()
    return invite, _build_claim_url(token)


def _serialize_utm_tracking_link(
    link: UTMTrackingLink,
    *,
    registrations_count: int = 0,
    buyers_count: int = 0,
    purchases_count: int = 0,
    revenue_amount: float = 0.0,
) -> dict:
    return {
        "id": link.id,
        "code": link.code,
        "utm_source": link.utm_source,
        "utm_medium": link.utm_medium,
        "utm_campaign": link.utm_campaign,
        "target_path": link.target_path,
        "note": link.note,
        "generated_url": _build_tracking_url(link),
        "is_active": bool(link.is_active),
        "registrations_count": registrations_count,
        "buyers_count": buyers_count,
        "purchases_count": purchases_count,
        "revenue_amount": round_money(revenue_amount),
        "created_at": link.created_at.isoformat() if link.created_at else None,
    }


def _serialize_plan_grant(grant: PlanAccessGrant, *, user: User | None = None, plan: PricingPlan | None = None) -> dict:
    return {
        "id": grant.id,
        "user_id": grant.user_id,
        "user_email": user.email if user else None,
        "pricing_plan_id": grant.pricing_plan_id,
        "plan_name_ru": plan.name_ru if plan else None,
        "plan_name_en": plan.name_en if plan else None,
        "source_invite_id": grant.source_invite_id,
        "is_active": bool(grant.is_active),
        "granted_at": grant.granted_at.isoformat() if grant.granted_at else None,
        "expires_at": grant.expires_at.isoformat() if grant.expires_at else None,
    }

# --- STATISTICS ---
@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    total_users = db.query(User).count()
    total_tasks = db.query(Task).filter(Task.status == "success").count()
    total_credits_spent = db.query(func.sum(Task.cost)).filter(Task.status == "success").scalar() or 0.0
    total_revenue = (
        db.query(func.coalesce(func.sum(PaymentRecord.amount), 0.0))
        .filter(PaymentRecord.status == "succeeded")
        .scalar()
        or 0.0
    )
    kie_remaining_credits = get_kie_remaining_credits_sync()

    # Breakdown by category
    category_counts = db.query(Task.category, func.count(Task.id)).filter(Task.status == "success").group_by(Task.category).all()
    tasks_by_category: Dict[str, int] = {}
    for cat, count in category_counts:
        tasks_by_category[cat or "other"] = count

    return {
        "total_users": total_users,
        "total_tasks": total_tasks,
        "total_credits_spent": round(float(total_credits_spent), 2),
        "total_revenue": round(float(total_revenue), 2),
        "kie_remaining_credits": kie_remaining_credits,
        "tasks_by_category": tasks_by_category,
    }


@router.get("/analytics")
def get_admin_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    now = _utcnow()
    periods = {
        "today": now - timedelta(days=1),
        "7d": now - timedelta(days=7),
        "30d": now - timedelta(days=30),
        "all": None,
    }

    revenue_by_period: dict[str, float] = {}
    buyers_by_period: dict[str, int] = {}
    registrations_by_period: dict[str, int] = {}
    for key, start_at in periods.items():
        user_query = db.query(User)
        payment_query = db.query(PaymentRecord).filter(PaymentRecord.status == "succeeded")
        if start_at is not None:
            user_query = user_query.filter(User.created_at >= start_at)
            payment_query = payment_query.filter(PaymentRecord.created_at >= start_at)

        registrations_by_period[key] = int(user_query.count())
        revenue_by_period[key] = round_money(payment_query.with_entities(func.coalesce(func.sum(PaymentRecord.amount), 0.0)).scalar() or 0.0)
        buyers_by_period[key] = int(payment_query.with_entities(func.count(func.distinct(PaymentRecord.user_id))).scalar() or 0)

    top_utm_rows = (
        db.query(
            UTMTrackingLink.code,
            func.count(func.distinct(User.id)),
            func.count(PaymentRecord.id),
            func.count(func.distinct(PaymentRecord.user_id)),
            func.coalesce(func.sum(PaymentRecord.amount), 0.0),
        )
        .outerjoin(User, User.utm_link_id == UTMTrackingLink.id)
        .outerjoin(
            PaymentRecord,
            (PaymentRecord.user_id == User.id)
            & (PaymentRecord.status == "succeeded")
            & (PaymentRecord.product_type == PRODUCT_TYPE_PLAN),
        )
        .group_by(UTMTrackingLink.id, UTMTrackingLink.code)
        .order_by(func.coalesce(func.sum(PaymentRecord.amount), 0.0).desc(), func.count(func.distinct(User.id)).desc())
        .limit(8)
        .all()
    )

    return {
        "periods": {
            key: {
                "revenue_amount": revenue_by_period[key],
                "buyers_count": buyers_by_period[key],
                "registrations_count": registrations_by_period[key],
                "conversion_rate": round((buyers_by_period[key] / registrations_by_period[key] * 100), 2) if registrations_by_period[key] else 0.0,
            }
            for key in periods
        },
        "top_utm_links": [
            {
                "code": code,
                "registrations_count": int(registrations_count or 0),
                "purchases_count": int(purchases_count or 0),
                "buyers_count": int(buyers_count or 0),
                "revenue_amount": round_money(revenue_amount or 0.0),
            }
            for code, registrations_count, purchases_count, buyers_count, revenue_amount in top_utm_rows
        ],
    }

# --- USERS ---
@router.get("/users")
def get_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    users = db.query(User).order_by(User.id.desc()).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "display_name": u.display_name,
            "avatar_url": u.avatar_url,
            "moderation_notice": u.moderation_notice,
            "moderation_required": bool(u.moderation_required),
            "is_superuser": u.is_superuser,
            "balance": u.balance,
        }
        for u in users
    ]

@router.patch("/users/{user_id}/balance")
def adjust_user_balance(
    user_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    amount = float(data.get("amount", 0))
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.balance = max(0.0, user.balance + amount)
    db.commit()
    return {"id": user.id, "balance": user.balance}


@router.get("/users/{user_id}/details")
def get_user_details(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    payments = (
        db.query(PaymentRecord)
        .filter(PaymentRecord.user_id == user.id)
        .order_by(PaymentRecord.created_at.desc())
        .limit(20)
        .all()
    )
    subscriptions = (
        db.query(Subscription)
        .filter(Subscription.user_id == user.id)
        .order_by(Subscription.created_at.desc())
        .limit(10)
        .all()
    )
    invites = (
        db.query(PlanInvite)
        .filter((PlanInvite.email == user.email) | (PlanInvite.used_by_user_id == user.id))
        .order_by(PlanInvite.created_at.desc())
        .limit(10)
        .all()
    )
    tasks = (
        db.query(Task)
        .filter(Task.user_id == user.id)
        .order_by(Task.created_at.desc())
        .limit(12)
        .all()
    )
    grants = (
        db.query(PlanAccessGrant)
        .filter(PlanAccessGrant.user_id == user.id)
        .order_by(PlanAccessGrant.granted_at.desc(), PlanAccessGrant.id.desc())
        .all()
    )
    plan_ids = {grant.pricing_plan_id for grant in grants} | {invite.pricing_plan_id for invite in invites}
    plan_map = {
        plan.id: plan
        for plan in (db.query(PricingPlan).filter(PricingPlan.id.in_(tuple(plan_ids))).all() if plan_ids else [])
    }

    total_spent = (
        db.query(func.coalesce(func.sum(PaymentRecord.amount), 0.0))
        .filter(PaymentRecord.user_id == user.id, PaymentRecord.status == "succeeded")
        .scalar()
        or 0.0
    )

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
            "balance": user.balance,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "is_superuser": user.is_superuser,
            "utm_code": user.utm_code,
            "utm_source": user.utm_source,
            "utm_medium": user.utm_medium,
            "utm_campaign": user.utm_campaign,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
        "stats": {
            "total_spent": round_money(total_spent),
            "payments_count": len(payments),
            "tasks_count": db.query(Task).filter(Task.user_id == user.id).count(),
            "successful_tasks_count": db.query(Task).filter(Task.user_id == user.id, Task.status == "success").count(),
        },
        "payments": [
            {
                "id": payment.id,
                "public_id": payment.public_id,
                "status": payment.status,
                "amount": payment.amount,
                "currency": payment.currency,
                "credits": payment.credits,
                "product_type": payment.product_type,
                "created_at": payment.created_at.isoformat() if payment.created_at else None,
            }
            for payment in payments
        ],
        "subscriptions": [
            {
                "id": subscription.id,
                "public_id": subscription.public_id,
                "status": subscription.status,
                "amount": subscription.amount,
                "currency": subscription.currency,
                "credits": subscription.credits,
                "interval_days": subscription.interval_days,
                "next_charge_at": subscription.next_charge_at.isoformat() if subscription.next_charge_at else None,
            }
            for subscription in subscriptions
        ],
        "invites": [
            _serialize_plan_invite(invite, plan=plan_map.get(invite.pricing_plan_id), used_by_email=user.email if invite.used_by_user_id == user.id else None)
            for invite in invites
        ],
        "grants": [
            _serialize_plan_grant(grant, user=user, plan=plan_map.get(grant.pricing_plan_id))
            for grant in grants
        ],
        "tasks": [
            {
                "id": task.id,
                "category": task.category,
                "model": task.model,
                "status": task.status,
                "cost": task.cost,
                "created_at": task.created_at.isoformat() if task.created_at else None,
            }
            for task in tasks
        ],
    }

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"status": "success"}


@router.patch("/users/{user_id}/profile")
def moderate_user_profile(
    user_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if "display_name" in data:
        raw_display_name = data.get("display_name")
        user.display_name = str(raw_display_name).strip() if raw_display_name else None

    if "avatar_url" in data:
        raw_avatar_url = data.get("avatar_url")
        user.avatar_url = str(raw_avatar_url).strip() if raw_avatar_url else None

    if "moderation_notice" in data:
        raw_notice = data.get("moderation_notice")
        user.moderation_notice = str(raw_notice).strip() if raw_notice else None

    if "moderation_required" in data:
        user.moderation_required = bool(data.get("moderation_required"))

    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "moderation_notice": user.moderation_notice,
        "moderation_required": user.moderation_required,
    }

# --- TASKS ---
@router.get("/tasks")
def get_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    tasks = db.query(Task).order_by(Task.created_at.desc()).limit(100).all()
    return tasks

@router.get("/logs")
def get_admin_logs(
    level: str | None = Query(default=None),
    scope: str | None = Query(default=None),
    task_id: int | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    query = db.query(AdminLog)
    if level:
        query = query.filter(AdminLog.level == level.upper())
    if scope:
        query = query.filter(AdminLog.scope == scope)
    if task_id is not None:
        query = query.filter(AdminLog.task_id == task_id)
    return query.order_by(AdminLog.created_at.desc(), AdminLog.id.desc()).limit(limit).all()

@router.delete("/tasks/{task_id}")
def admin_delete_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"status": "success"}

@router.get("/audio-tasks")
def get_audio_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    tasks = (
        db.query(Task)
        .filter(Task.category == "audio", Task.status == "success", Task.output_url.isnot(None))
        .order_by(Task.created_at.desc())
        .limit(120)
        .all()
    )
    return tasks

# --- PROMOTIONS ---
@router.get("/promotions")
def get_promotions(db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    return db.query(Promotion).all()

@router.post("/promotions")
def create_promotion(data: PromotionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    promo = Promotion(**data.model_dump())
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return promo

@router.delete("/promotions/{promo_id}")
def delete_promotion(promo_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    promo = db.query(Promotion).filter(Promotion.id == promo_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(promo)
    db.commit()
    return {"status": "success"}

# --- BANNERS ---
@router.get("/banners")
def get_banners(db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    return db.query(Banner).all()

@router.post("/banners")
def create_banner(
    title: str = Form(...),
    subtitle: str = Form(None),
    target_url: str = Form(None),
    image_url: str = Form(None),
    image: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    url = image_url
    if image:
        url = save_validated_image_upload(
            image,
            upload_root=settings.UPLOAD_DIR,
            max_bytes=settings.UPLOAD_MAX_BYTES,
            subdir="banners",
        )

    banner = Banner(title=title, subtitle=subtitle, image_url=url, target_url=target_url)
    db.add(banner)
    db.commit()
    db.refresh(banner)
    return banner

@router.delete("/banners/{banner_id}")
def delete_banner(banner_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(banner)
    db.commit()
    return {"status": "success"}

# --- FEATURED AUDIO ---
@router.get("/featured-audio")
def get_featured_audio(db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    return db.query(FeaturedAudio).order_by(FeaturedAudio.sort_order.asc(), FeaturedAudio.id.desc()).all()

@router.post("/featured-audio")
def create_featured_audio(
    title: str = Form(...),
    subtitle: str = Form(None),
    description: str = Form(None),
    prompt: str = Form(None),
    audio_url: str = Form(...),
    model: str = Form(None),
    source_task_id: int = Form(None),
    sort_order: int = Form(0),
    is_active: bool = Form(True),
    cover_image_url: str = Form(None),
    cover_image: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser)
):
    cover_url = cover_image_url
    if cover_image:
        cover_url = save_validated_image_upload(
            cover_image,
            upload_root=settings.UPLOAD_DIR,
            max_bytes=settings.UPLOAD_MAX_BYTES,
            subdir="featured-audio",
        )

    item = FeaturedAudio(
        title=title,
        subtitle=subtitle,
        description=description,
        prompt=prompt,
        audio_url=audio_url,
        cover_image_url=cover_url,
        model=model,
        source_task_id=source_task_id,
        sort_order=sort_order,
        is_active=is_active,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/featured-audio/{item_id}")
def delete_featured_audio(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    item = db.query(FeaturedAudio).filter(FeaturedAudio.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(item)
    db.commit()
    return {"status": "success"}

# --- FAQS ---
@router.get("/faqs")
def get_faqs(db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    return db.query(FAQ).order_by(FAQ.order_index).all()

@router.post("/faqs")
def create_faq(data: FAQCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    faq = FAQ(**data.model_dump())
    db.add(faq)
    db.commit()
    db.refresh(faq)
    return faq

@router.delete("/faqs/{faq_id}")
def delete_faq(faq_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(faq)
    db.commit()
    return {"status": "success"}

# --- EXAMPLES ---
@router.get("/examples")
def get_examples(category: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    query = db.query(GenerationExample)
    if category:
        query = query.filter(GenerationExample.category == category)
    return query.all()

@router.post("/examples")
def create_example(
    title: str = Form(...),
    category: str = Form(...),
    media_url: str = Form(None),
    prompt: str = Form(None),
    model: str = Form(None),
    is_trending: bool = Form(False),
    media: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    url = media_url
    if media:
        url = save_validated_upload(
            media,
            upload_root=settings.UPLOAD_DIR,
            max_bytes=settings.EXAMPLE_UPLOAD_MAX_BYTES,
            subdir="examples",
        )
    if not url:
        raise HTTPException(status_code=400, detail="Provide a media file or media_url")
    example = GenerationExample(title=title, category=category, media_url=url, prompt=prompt, model=model, is_trending=is_trending)
    db.add(example)
    db.commit()
    db.refresh(example)
    return example

@router.put("/examples/{example_id}")
def update_example(example_id: int, data: ExampleUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    example = db.query(GenerationExample).filter(GenerationExample.id == example_id).first()
    if not example:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(example, field, value)
    db.commit()
    db.refresh(example)
    return example

@router.delete("/examples/{example_id}")
def delete_example(example_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    example = db.query(GenerationExample).filter(GenerationExample.id == example_id).first()
    if not example:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(example)
    db.commit()
    return {"status": "success"}

# --- SETTINGS (Terms, Privacy, AI default pricing) ---
@router.get("/settings")
def get_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    settings = db.query(SiteSetting).all()
    return {s.key: s.value for s in settings}

@router.post("/settings")
def update_settings(data: SettingsUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    for key, value in data.settings.items():
        setting = db.query(SiteSetting).filter(SiteSetting.key == key).first()
        if setting:
            setting.value = value
        else:
            db.add(SiteSetting(key=key, value=value))
    db.commit()
    return {"status": "success"}

# --- FEEDBACK ---
@router.get("/feedbacks")
def get_feedbacks(db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    return db.query(Feedback).all()

# --- PRICING ---
@router.get("/prices")
def get_prices(db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    return db.query(ModelPricing).all()

@router.post("/prices")
def add_price(data: PricingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    price = ModelPricing(**data.model_dump())
    db.add(price)
    db.commit()
    db.refresh(price)
    return price

@router.delete("/prices/{price_id}")
def delete_price(price_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    p = db.query(ModelPricing).filter(ModelPricing.id == price_id).first()
    if p:
        db.delete(p)
        db.commit()
    return {"status": "success"}

@router.put("/prices/{price_id}")
def update_price(price_id: int, data: PricingUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    price = db.query(ModelPricing).filter(ModelPricing.id == price_id).first()
    if not price:
        raise HTTPException(status_code=404, detail="Price not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(price, key, value)

    db.commit()
    db.refresh(price)
    return price

# --- PRICING PLANS ---
@router.get("/pricing-plans")
def get_pricing_plans(db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    return (
        db.query(PricingPlan)
        .order_by(PricingPlan.is_featured.desc(), PricingPlan.sort_order.asc(), PricingPlan.id.asc())
        .all()
    )

@router.post("/pricing-plans")
def create_pricing_plan(data: PricingPlanCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    plan = PricingPlan(**data.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan

@router.put("/pricing-plans/{plan_id}")
def update_pricing_plan(plan_id: int, data: PricingPlanUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    plan = db.query(PricingPlan).filter(PricingPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Pricing plan not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(plan, key, value)

    db.commit()
    db.refresh(plan)
    return plan

@router.delete("/pricing-plans/{plan_id}")
def delete_pricing_plan(plan_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_superuser)):
    plan = db.query(PricingPlan).filter(PricingPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Pricing plan not found")

    db.delete(plan)
    db.commit()
    return {"status": "success"}


@router.get("/plan-invites")
def get_plan_invites(
    limit: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    invites = (
        db.query(PlanInvite)
        .order_by(PlanInvite.created_at.desc(), PlanInvite.id.desc())
        .limit(limit)
        .all()
    )
    plan_ids = {invite.pricing_plan_id for invite in invites}
    user_ids = {invite.used_by_user_id for invite in invites if invite.used_by_user_id}
    plans = db.query(PricingPlan).filter(PricingPlan.id.in_(tuple(plan_ids))).all() if plan_ids else []
    users = db.query(User).filter(User.id.in_(tuple(user_ids))).all() if user_ids else []
    plan_map = {plan.id: plan for plan in plans}
    user_map = {user.id: user.email for user in users}

    return {
        "items": [
            _serialize_plan_invite(
                invite,
                plan=plan_map.get(invite.pricing_plan_id),
                used_by_email=user_map.get(invite.used_by_user_id),
            )
            for invite in invites
        ],
        "summary": {
            "total": len(invites),
            "pending": sum(1 for invite in invites if invite.status in {"pending", "sent", "failed"}),
            "claimed": sum(1 for invite in invites if invite.status == "claimed"),
            "revoked": sum(1 for invite in invites if invite.status == "revoked"),
        },
    }


@router.post("/plan-invites/bulk")
def create_plan_invites(
    data: PlanInviteBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    plan = db.query(PricingPlan).filter(PricingPlan.id == data.pricing_plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Pricing plan not found")

    if not plan.is_active:
        raise HTTPException(status_code=400, detail="Pricing plan is inactive")

    now = _utcnow()
    invite_lifetime_days = data.expires_in_days if data.expires_in_days is not None else (int(plan.recurring_days or 0) if plan.is_recurring else None)
    expires_at = now + timedelta(days=invite_lifetime_days) if invite_lifetime_days else None
    created_items: list[dict] = []
    sent_count = 0
    failed_count = 0

    for email in data.emails:
        invite, claim_url = _create_plan_invite(
            db=db,
            email=email,
            plan=plan,
            expires_at=expires_at,
        )
        try:
            _send_plan_invite_email(
                invite.email,
                plan_name=plan.name_ru or plan.name_en or "Globus AI plan",
                claim_url=claim_url,
                expires_at=expires_at,
            )
            invite.status = "sent"
            invite.sent_at = now
            sent_count += 1
        except Exception as exc:
            invite.status = "failed"
            invite.error_message = str(exc)
            failed_count += 1

        created_items.append(_serialize_plan_invite(invite, plan=plan))

    db.commit()
    return {
        "created": len(created_items),
        "sent": sent_count,
        "failed": failed_count,
        "items": created_items,
    }


@router.patch("/plan-invites/{invite_id}")
def update_plan_invite(
    invite_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    invite = db.query(PlanInvite).filter(PlanInvite.id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Plan invite not found")

    if "status" in data:
        next_status = str(data.get("status") or "").strip().lower()
        if next_status not in {"revoked"}:
            raise HTTPException(status_code=400, detail="Unsupported invite status")
        if invite.status == "claimed":
            raise HTTPException(status_code=400, detail="Claimed invites cannot be revoked")
        invite.status = "revoked"
        invite.error_message = None

    db.commit()
    db.refresh(invite)
    plan = db.query(PricingPlan).filter(PricingPlan.id == invite.pricing_plan_id).first()
    used_by_email = None
    if invite.used_by_user_id:
        used_by_email = db.query(User.email).filter(User.id == invite.used_by_user_id).scalar()
    return _serialize_plan_invite(invite, plan=plan, used_by_email=used_by_email)


@router.post("/plan-invites/{invite_id}/reissue")
def reissue_plan_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    source_invite = db.query(PlanInvite).filter(PlanInvite.id == invite_id).first()
    if not source_invite:
        raise HTTPException(status_code=404, detail="Plan invite not found")

    plan = db.query(PricingPlan).filter(PricingPlan.id == source_invite.pricing_plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Pricing plan not found")
    if not plan.is_active:
        raise HTTPException(status_code=400, detail="Pricing plan is inactive")

    now = _utcnow()
    invite, claim_url = _create_plan_invite(
        db=db,
        email=source_invite.email,
        plan=plan,
        expires_at=source_invite.expires_at,
    )

    try:
        _send_plan_invite_email(
            invite.email,
            plan_name=plan.name_ru or plan.name_en or "Globus AI plan",
            claim_url=claim_url,
            expires_at=invite.expires_at,
        )
        invite.status = "sent"
        invite.sent_at = now
    except Exception as exc:
        invite.status = "failed"
        invite.error_message = str(exc)

    db.commit()
    db.refresh(invite)
    return {
        "invite": _serialize_plan_invite(invite, plan=plan),
        "claim_url": claim_url,
    }


@router.get("/utm-links")
def get_utm_links(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    links = db.query(UTMTrackingLink).order_by(UTMTrackingLink.created_at.desc(), UTMTrackingLink.id.desc()).all()
    link_ids = [link.id for link in links]

    registrations_map: dict[int, int] = {}
    buyers_map: dict[int, int] = {}
    purchases_map: dict[int, int] = {}
    revenue_map: dict[int, float] = {}

    if link_ids:
        registration_rows = (
            db.query(User.utm_link_id, func.count(User.id))
            .filter(User.utm_link_id.in_(tuple(link_ids)))
            .group_by(User.utm_link_id)
            .all()
        )
        registrations_map = {int(link_id): int(count) for link_id, count in registration_rows if link_id is not None}

        purchase_rows = (
            db.query(
                User.utm_link_id,
                func.count(func.distinct(PaymentRecord.user_id)),
                func.count(PaymentRecord.id),
                func.coalesce(func.sum(PaymentRecord.amount), 0.0),
            )
            .join(PaymentRecord, PaymentRecord.user_id == User.id)
            .filter(
                User.utm_link_id.in_(tuple(link_ids)),
                PaymentRecord.status == "succeeded",
                PaymentRecord.product_type == PRODUCT_TYPE_PLAN,
            )
            .group_by(User.utm_link_id)
            .all()
        )
        for link_id, buyers_count, purchases_count, revenue_amount in purchase_rows:
            if link_id is None:
                continue
            normalized_link_id = int(link_id)
            buyers_map[normalized_link_id] = int(buyers_count or 0)
            purchases_map[normalized_link_id] = int(purchases_count or 0)
            revenue_map[normalized_link_id] = float(revenue_amount or 0.0)

    return {
        "items": [
            _serialize_utm_tracking_link(
                link,
                registrations_count=registrations_map.get(link.id, 0),
                buyers_count=buyers_map.get(link.id, 0),
                purchases_count=purchases_map.get(link.id, 0),
                revenue_amount=revenue_map.get(link.id, 0.0),
            )
            for link in links
        ],
        "summary": {
            "total": len(links),
            "registrations": sum(registrations_map.values()),
            "buyers": sum(buyers_map.values()),
            "revenue_amount": round_money(sum(revenue_map.values())),
        },
    }


@router.post("/utm-links")
def create_utm_link(
    data: UTMTrackingLinkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    existing = db.query(UTMTrackingLink).filter(UTMTrackingLink.code == data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="UTM code already exists")

    link = UTMTrackingLink(
        code=data.code,
        utm_source=data.code,
        utm_medium="creator",
        utm_campaign="bloggers",
        target_path=data.target_path or "/ru/register",
        note=data.note,
        is_active=True,
        created_by_user_id=current_user.id,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return _serialize_utm_tracking_link(link)


@router.patch("/utm-links/{link_id}")
def update_utm_link(
    link_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    link = db.query(UTMTrackingLink).filter(UTMTrackingLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="UTM link not found")

    if "code" in data and data.get("code"):
        normalized_code = str(data.get("code")).strip().lower()
        existing = db.query(UTMTrackingLink).filter(UTMTrackingLink.code == normalized_code, UTMTrackingLink.id != link.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="UTM code already exists")
        link.code = normalized_code
        link.utm_source = normalized_code
    if "target_path" in data and data.get("target_path"):
        target_path = str(data.get("target_path")).strip()
        link.target_path = target_path if target_path.startswith("/") else f"/{target_path}"
    if "note" in data:
        raw_note = data.get("note")
        link.note = str(raw_note).strip() if raw_note else None
    if "is_active" in data:
        link.is_active = bool(data.get("is_active"))

    db.commit()
    db.refresh(link)
    return _serialize_utm_tracking_link(link)


@router.get("/plan-grants")
def get_plan_grants(
    limit: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    grants = (
        db.query(PlanAccessGrant)
        .order_by(PlanAccessGrant.granted_at.desc(), PlanAccessGrant.id.desc())
        .limit(limit)
        .all()
    )
    user_ids = {grant.user_id for grant in grants}
    plan_ids = {grant.pricing_plan_id for grant in grants}
    users = db.query(User).filter(User.id.in_(tuple(user_ids))).all() if user_ids else []
    plans = db.query(PricingPlan).filter(PricingPlan.id.in_(tuple(plan_ids))).all() if plan_ids else []
    user_map = {user.id: user for user in users}
    plan_map = {plan.id: plan for plan in plans}
    return {
        "items": [
            _serialize_plan_grant(grant, user=user_map.get(grant.user_id), plan=plan_map.get(grant.pricing_plan_id))
            for grant in grants
        ]
    }


@router.post("/plan-grants")
def create_plan_grant(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    user_id = int(data.get("user_id", 0))
    pricing_plan_id = int(data.get("pricing_plan_id", 0))
    expires_in_days = data.get("expires_in_days")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    plan = db.query(PricingPlan).filter(PricingPlan.id == pricing_plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Pricing plan not found")

    expires_at = None
    if expires_in_days not in (None, "", 0, "0"):
        expires_at = _utcnow() + timedelta(days=max(int(expires_in_days), 1))

    grant = PlanAccessGrant(
        user_id=user.id,
        pricing_plan_id=plan.id,
        is_active=True,
        expires_at=expires_at,
    )
    db.add(grant)
    db.commit()
    db.refresh(grant)
    return _serialize_plan_grant(grant, user=user, plan=plan)


@router.patch("/plan-grants/{grant_id}")
def update_plan_grant(
    grant_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    grant = db.query(PlanAccessGrant).filter(PlanAccessGrant.id == grant_id).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Plan grant not found")

    if "is_active" in data:
        grant.is_active = bool(data.get("is_active"))

    if "expires_in_days" in data:
        expires_in_days = data.get("expires_in_days")
        if expires_in_days in (None, "", 0, "0"):
            grant.expires_at = None
        else:
            grant.expires_at = _utcnow() + timedelta(days=max(int(expires_in_days), 1))

    db.commit()
    db.refresh(grant)
    user = db.query(User).filter(User.id == grant.user_id).first()
    plan = db.query(PricingPlan).filter(PricingPlan.id == grant.pricing_plan_id).first()
    return _serialize_plan_grant(grant, user=user, plan=plan)

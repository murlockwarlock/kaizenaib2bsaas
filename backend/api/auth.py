import logging
import random
import hashlib
import json

import redis
from fastapi import APIRouter, Depends, HTTPException, status, Request, Form
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import timedelta

from core.database import get_db
from core.config import settings
from core.security import verify_password, get_password_hash, create_access_token
from models.user import User
from models.notification import UserNotification
from models.admin import PricingPlan
from models.billing import PlanAccessGrant, PlanInvite, UTMTrackingLink
from api.schemas import UserCreate, UserResponse, Token, PasswordResetRequest, PasswordResetConfirm, PlanInviteClaimRequest, UserProfileUpdate, NotificationListResponse, NotificationResponse
from api.deps import get_current_active_user
from core.rate_limit import limiter
from services.billing import round_money
from services.social_auth import (
    OAuthError,
    build_apple_authorize_url,
    build_google_authorize_url,
    build_session_bridge_html,
    build_vk_authorize_url,
    create_login_token_for_user,
    create_oauth_state,
    decode_oauth_state,
    exchange_provider_code,
    resolve_or_create_social_user,
)
from services.email import send_html_email

router = APIRouter()
logger = logging.getLogger(__name__)

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

DEFAULT_VERIFICATION_CREDITS = 100.0
VERIFY_TTL = 600  # 10 minutes
RESET_TTL = 600  # 10 minutes


def _get_initial_credits(db: Session) -> float:
    from models.admin import SiteSetting
    setting = db.query(SiteSetting).filter(SiteSetting.key == "initial_credits").first()
    try:
        return float(setting.value) if setting else DEFAULT_VERIFICATION_CREDITS
    except (ValueError, TypeError):
        return DEFAULT_VERIFICATION_CREDITS


def _generate_code(email: str) -> str:
    code = str(random.randint(100000, 999999))
    redis_client.setex(f"verify:{email}", VERIFY_TTL, code)
    return code


def _send_verification_email(email: str, code: str):
    body = f"""
    <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:32px;background:#09090b;border-radius:16px;color:#fff;">
      <h2 style="margin:0 0 8px;font-size:22px;">Confirm your email</h2>
      <p style="color:#a1a1aa;margin:0 0 24px;font-size:14px;">Enter this code in KaizenAI to activate your account and get 100 free credits.</p>
      <div style="font-size:36px;font-weight:900;letter-spacing:10px;text-align:center;padding:20px;background:#18181b;border-radius:12px;border:1px solid #27272a;">
        {code}
      </div>
      <p style="color:#71717a;font-size:12px;margin:20px 0 0;text-align:center;">Code expires in 10 minutes. If you did not register, ignore this email.</p>
    </div>
    """
    send_html_email(email, 'KaizenAI — verification code', body)


def _send_password_reset_email(email: str, code: str):
    body = f"""
    <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:32px;background:#09090b;border-radius:16px;color:#fff;">
      <h2 style="margin:0 0 8px;font-size:22px;">Reset your password</h2>
      <p style="color:#a1a1aa;margin:0 0 24px;font-size:14px;">Enter this code in KaizenAI to set a new password.</p>
      <div style="font-size:36px;font-weight:900;letter-spacing:10px;text-align:center;padding:20px;background:#18181b;border-radius:12px;border:1px solid #27272a;">
        {code}
      </div>
      <p style="color:#71717a;font-size:12px;margin:20px 0 0;text-align:center;">Code expires in 10 minutes. If you did not request a password reset, ignore this email.</p>
    </div>
    """
    send_html_email(email, 'KaizenAI — password reset code', body)


def _utcnow():
    from datetime import UTC, datetime

    return datetime.now(UTC)


def _hash_invite_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _normalize_tracking_value(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _apply_utm_attribution(db: Session, user: User, user_in: UserCreate) -> None:
    utm_code = _normalize_tracking_value(user_in.utm_code)
    utm_source = _normalize_tracking_value(user_in.utm_source)
    utm_medium = _normalize_tracking_value(user_in.utm_medium)
    utm_campaign = _normalize_tracking_value(user_in.utm_campaign)

    lookup_code = (utm_code or utm_source or "").lower()
    matched_link = None
    if lookup_code:
        matched_link = (
            db.query(UTMTrackingLink)
            .filter(UTMTrackingLink.code == lookup_code, UTMTrackingLink.is_active == True)
            .first()
        )

    if matched_link:
        user.utm_link_id = matched_link.id
        user.utm_code = matched_link.code
        user.utm_source = utm_source or matched_link.utm_source or matched_link.code
        user.utm_medium = utm_medium or matched_link.utm_medium
        user.utm_campaign = utm_campaign or matched_link.utm_campaign
        user.utm_attributed_at = _utcnow()
        return

    if utm_code or utm_source or utm_medium or utm_campaign:
        user.utm_code = (utm_code or utm_source or "").lower() or None
        user.utm_source = utm_source or None
        user.utm_medium = utm_medium or None
        user.utm_campaign = utm_campaign or None
        user.utm_attributed_at = _utcnow()


def _get_valid_plan_invite(db: Session, token: str) -> PlanInvite:
    invite = db.query(PlanInvite).filter(PlanInvite.token_hash == _hash_invite_token(token)).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite link not found")

    if invite.status in {"claimed", "revoked"} or invite.used_at is not None:
        raise HTTPException(status_code=400, detail="Invite link has already been used")

    now = _utcnow()
    if invite.expires_at:
        expires_at = invite.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=now.tzinfo)
        if expires_at <= now:
            raise HTTPException(status_code=400, detail="Invite link has expired")

    return invite


class VerifyEmailRequest(BaseModel):
    email: str
    code: str

class ResendCodeRequest(BaseModel):
    email: str


def _normalize_next_path(next_path: str | None) -> str:
    if not next_path:
        return "/dashboard"
    return next_path if next_path.startswith("/") else "/dashboard"


def _build_social_error_redirect(locale: str, error_code: str) -> RedirectResponse:
    safe_locale = locale if locale in {"ru", "en"} else "ru"
    return RedirectResponse(url=f"/{safe_locale}/login?social_error={error_code}", status_code=302)


def _resolve_social_error_locale(state: str | None, fallback: str = "ru") -> str:
    if not state:
        return fallback
    try:
        payload = decode_oauth_state(state)
        locale = payload.get("locale")
        return locale if locale in {"ru", "en"} else fallback
    except Exception:
        return fallback


def _serialize_notification(item: UserNotification) -> NotificationResponse:
    metadata = None
    if item.metadata_json:
        try:
            metadata = json.loads(item.metadata_json)
        except Exception:
            metadata = None

    return NotificationResponse(
        id=item.id,
        kind=item.kind,
        title=item.title,
        message=item.message,
        is_read=bool(item.is_read),
        task_id=item.task_id,
        metadata=metadata,
        read_at=item.read_at,
        created_at=item.created_at,
    )


def _get_social_provider_config() -> dict[str, bool]:
    return {
        "google": bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET),
        "apple": bool(
            settings.APPLE_CLIENT_ID
            and settings.APPLE_TEAM_ID
            and settings.APPLE_KEY_ID
            and settings.APPLE_PRIVATE_KEY
        ),
        "vk": bool(settings.VK_CLIENT_ID and settings.VK_CLIENT_SECRET),
    }


@router.post("/register", response_model=UserResponse)
@limiter.limit("3/minute")
def register(request: Request, user_in: UserCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="The user with this email already exists in the system.")
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        balance=0.0,
        is_verified=False,
    )
    _apply_utm_attribution(db, user, user_in)
    db.add(user)
    db.commit()
    db.refresh(user)

    code = _generate_code(user_in.email)
    try:
        _send_verification_email(user_in.email, code)
    except Exception as e:
        logger.warning("Failed to send verification email: %s", e)

    return user


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login_access_token(request: Request, db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            {"sub": user.email, "pv": user.password_version},
            expires_delta=access_token_expires,
        ),
        "token_type": "bearer",
    }


@router.get("/oauth/providers")
def get_social_providers_config():
    return _get_social_provider_config()


@router.get("/oauth/{provider}/start")
async def oauth_start(provider: str, request: Request, locale: str = "ru", next: str = "/dashboard", mode: str = "login"):
    safe_provider = provider.lower()
    safe_locale = locale if locale in {"ru", "en"} else "ru"
    safe_next = _normalize_next_path(next)
    state = create_oauth_state(safe_provider, safe_locale, safe_next, mode)

    try:
        if safe_provider == "google":
            url = build_google_authorize_url(state, request)
        elif safe_provider == "apple":
            url = build_apple_authorize_url(state, request)
        elif safe_provider == "vk":
            url = build_vk_authorize_url(state, request)
        else:
            raise OAuthError("Unsupported OAuth provider")
    except OAuthError as exc:
        logger.warning("Social auth start failed for %s: %s", safe_provider, exc)
        return _build_social_error_redirect(safe_locale, "provider_not_configured")

    return RedirectResponse(url=url, status_code=302)


@router.get("/oauth/{provider}/callback")
@router.post("/oauth/{provider}/callback")
async def oauth_callback(
    provider: str,
    request: Request,
    db: Session = Depends(get_db),
    code: str | None = None,
    state: str | None = None,
    user: str | None = None,
):
    if request.method == "POST":
        form = await request.form()
        code = code or form.get("code")
        state = state or form.get("state")
        user = user or form.get("user")
    else:
        code = code or request.query_params.get("code")
        state = state or request.query_params.get("state")
        user = user or request.query_params.get("user")

    if not code or not state:
        return _build_social_error_redirect(_resolve_social_error_locale(state), "missing_oauth_payload")

    try:
        state_payload = decode_oauth_state(str(state))
        locale = state_payload.get("locale", "ru")
        next_path = _normalize_next_path(state_payload.get("next"))
        if state_payload.get("provider") != provider.lower():
            raise OAuthError("OAuth provider mismatch")
        provider_data = await exchange_provider_code(provider.lower(), str(code), request, raw_user_payload=str(user) if user else None)
        user_record = resolve_or_create_social_user(
            db,
            provider=provider_data["provider"],
            provider_subject=provider_data["provider_subject"],
            email=provider_data.get("email"),
            email_verified=bool(provider_data.get("email_verified")),
            display_name=provider_data.get("display_name"),
            avatar_url=provider_data.get("avatar_url"),
            initial_credits=_get_initial_credits(db),
        )
        token = create_login_token_for_user(user_record)
        return HTMLResponse(build_session_bridge_html(token, next_path, locale))
    except OAuthError as exc:
        logger.warning("Social auth callback failed for %s: %s", provider, exc)
        return _build_social_error_redirect(_resolve_social_error_locale(state), "oauth_failed")
    except Exception as exc:
        logger.exception("Unexpected social auth callback failure for %s", provider)
        logger.warning("Unexpected social auth callback failure: %s", exc)
        return _build_social_error_redirect(_resolve_social_error_locale(state), "oauth_failed")


@router.post("/verify-email")
@limiter.limit("5/minute")
def verify_email(request: Request, data: VerifyEmailRequest, db: Session = Depends(get_db)):
    stored = redis_client.get(f"verify:{data.email}")
    if not stored or stored != data.code:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_verified:
        redis_client.delete(f"verify:{data.email}")
        return {"status": "already_verified"}

    user.is_verified = True
    user.balance = _get_initial_credits(db)
    db.commit()
    redis_client.delete(f"verify:{data.email}")
    return {"status": "verified"}


@router.post("/resend-code")
@limiter.limit("3/minute")
def resend_code(request: Request, data: ResendCodeRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email already verified")

    code = _generate_code(data.email)
    try:
        _send_verification_email(data.email, code)
    except Exception as e:
        logger.warning("Failed to send verification email: %s", e)
        raise HTTPException(status_code=500, detail="Failed to send email")

    return {"status": "sent"}


@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.get("/notifications", response_model=NotificationListResponse)
def get_my_notifications(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    safe_limit = max(1, min(limit, 50))
    items = (
        db.query(UserNotification)
        .filter(UserNotification.user_id == current_user.id)
        .order_by(UserNotification.created_at.desc(), UserNotification.id.desc())
        .limit(safe_limit)
        .all()
    )
    unread_count = (
        db.query(UserNotification)
        .filter(UserNotification.user_id == current_user.id, UserNotification.is_read == False)
        .count()
    )
    return NotificationListResponse(
        items=[_serialize_notification(item) for item in items],
        unread_count=unread_count,
    )


@router.post("/notifications/{notification_id}/read", response_model=NotificationListResponse)
def mark_notification_read(
    notification_id: int,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    item = (
        db.query(UserNotification)
        .filter(UserNotification.id == notification_id, UserNotification.user_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Notification not found")

    if not item.is_read:
        item.is_read = True
        item.read_at = _utcnow()
        db.commit()

    return get_my_notifications(limit=limit, db=db, current_user=current_user)


@router.post("/notifications/read-all", response_model=NotificationListResponse)
def mark_all_notifications_read(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    unread_items = (
        db.query(UserNotification)
        .filter(UserNotification.user_id == current_user.id, UserNotification.is_read == False)
        .all()
    )
    now = _utcnow()
    for item in unread_items:
        item.is_read = True
        item.read_at = now
    if unread_items:
        db.commit()

    return get_my_notifications(limit=limit, db=db, current_user=current_user)


@router.put("/me/profile", response_model=UserResponse)
def update_my_profile(
    data: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    updates = data.model_dump(exclude_unset=True)
    touched_profile_identity = any(key in updates for key in ("display_name", "avatar_url"))
    for key, value in updates.items():
        setattr(current_user, key, value)
    if touched_profile_identity:
        current_user.moderation_required = False
        current_user.moderation_notice = None
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/request-password-reset")
@limiter.limit("3/minute")
def request_password_reset(request: Request, data: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        # Return 200 anyway to prevent user enumeration
        return {"status": "sent"}

    code = str(random.randint(100000, 999999))
    redis_client.setex(f"reset:{data.email}", RESET_TTL, code)

    try:
        _send_password_reset_email(data.email, code)
    except Exception as e:
        logger.warning("Failed to send password reset email: %s", e)

    return {"status": "sent"}


@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, data: PasswordResetConfirm, db: Session = Depends(get_db)):
    stored = redis_client.get(f"reset:{data.email}")
    if not stored or stored != data.code:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    user.hashed_password = get_password_hash(data.new_password)
    user.password_version += 1
    db.commit()

    redis_client.delete(f"reset:{data.email}")
    return {"status": "reset"}


@router.get("/invites/resolve")
def resolve_plan_invite(token: str, db: Session = Depends(get_db)):
    invite = _get_valid_plan_invite(db, token)
    plan = db.query(PricingPlan).filter(PricingPlan.id == invite.pricing_plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Pricing plan not found")

    return {
        "email": invite.email,
        "pricing_plan_id": invite.pricing_plan_id,
        "plan_name_ru": plan.name_ru,
        "plan_name_en": plan.name_en,
        "expires_at": invite.expires_at.isoformat() if invite.expires_at else None,
        "status": invite.status,
    }


@router.post("/invites/claim")
def claim_plan_invite(
    data: PlanInviteClaimRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    invite = _get_valid_plan_invite(db, data.token)
    if current_user.email.strip().lower() != invite.email.strip().lower():
        raise HTTPException(status_code=400, detail="This invite is linked to another email")

    plan = db.query(PricingPlan).filter(PricingPlan.id == invite.pricing_plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Pricing plan not found")

    grant = (
        db.query(PlanAccessGrant)
        .filter(
            PlanAccessGrant.user_id == current_user.id,
            PlanAccessGrant.pricing_plan_id == plan.id,
        )
        .order_by(PlanAccessGrant.granted_at.desc(), PlanAccessGrant.id.desc())
        .first()
    )

    grant_expires_at = invite.expires_at
    if grant:
        grant.is_active = True
        grant.expires_at = grant_expires_at
        grant.source_invite_id = invite.id
    else:
        grant = PlanAccessGrant(
            user_id=current_user.id,
            pricing_plan_id=plan.id,
            source_invite_id=invite.id,
            is_active=True,
            expires_at=grant_expires_at,
        )
        db.add(grant)

    current_user.balance = round_money(float(current_user.balance or 0) + float(plan.credits or 0))

    invite.status = "claimed"
    invite.used_at = _utcnow()
    invite.used_by_user_id = current_user.id

    db.commit()
    db.refresh(grant)

    return {
        "status": "claimed",
        "plan": {
            "id": plan.id,
            "name_ru": plan.name_ru,
            "name_en": plan.name_en,
        },
        "grant": {
            "id": grant.id,
            "expires_at": grant.expires_at.isoformat() if grant.expires_at else None,
        },
        "balance": current_user.balance,
    }

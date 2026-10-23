import json
import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

import httpx
from jose import JWTError, jwt
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.config import settings
from core.security import ALGORITHM, create_access_token, get_password_hash
from models.oauth_account import OAuthAccount
from models.user import User

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

APPLE_AUTH_URL = "https://appleid.apple.com/auth/authorize"
APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token"

VK_AUTH_URL = "https://oauth.vk.com/authorize"
VK_TOKEN_URL = "https://oauth.vk.com/access_token"
VK_USERINFO_URL = "https://api.vk.com/method/users.get"
VK_API_VERSION = "5.199"

OAUTH_STATE_EXP_MINUTES = 10


class OAuthError(Exception):
    pass


def _utcnow() -> datetime:
    return datetime.now(UTC)


def build_public_origin(request) -> str:
    if settings.public_base_url:
        return settings.public_base_url

    forwarded_proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host") or request.url.netloc
    return f"{forwarded_proto}://{forwarded_host}".rstrip("/")


def build_callback_url(provider: str, request) -> str:
    return f"{build_public_origin(request)}/api/v1/auth/oauth/{provider}/callback"


def create_oauth_state(provider: str, locale: str, next_path: str, mode: str) -> str:
    safe_next = next_path if next_path.startswith("/") else "/dashboard"
    payload = {
        "type": "oauth_state",
        "provider": provider,
        "locale": locale if locale in {"ru", "en"} else "ru",
        "next": safe_next,
        "mode": mode if mode in {"login", "register"} else "login",
        "exp": _utcnow() + timedelta(minutes=OAUTH_STATE_EXP_MINUTES),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_oauth_state(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise OAuthError("Invalid OAuth state") from exc

    if payload.get("type") != "oauth_state":
        raise OAuthError("Invalid OAuth state")
    return payload


def build_google_authorize_url(state: str, request) -> str:
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise OAuthError("Google OAuth is not configured")

    query = urlencode(
        {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": build_callback_url("google", request),
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "include_granted_scopes": "true",
            "prompt": "select_account",
            "state": state,
        }
    )
    return f"{GOOGLE_AUTH_URL}?{query}"


def _build_apple_client_secret() -> str:
    if not all([settings.APPLE_CLIENT_ID, settings.APPLE_TEAM_ID, settings.APPLE_KEY_ID, settings.APPLE_PRIVATE_KEY]):
        raise OAuthError("Apple OAuth is not configured")

    private_key = settings.APPLE_PRIVATE_KEY.replace("\\n", "\n")
    now = _utcnow()
    payload = {
        "iss": settings.APPLE_TEAM_ID,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=180)).timestamp()),
        "aud": "https://appleid.apple.com",
        "sub": settings.APPLE_CLIENT_ID,
    }
    return jwt.encode(
        payload,
        private_key,
        algorithm="ES256",
        headers={"kid": settings.APPLE_KEY_ID},
    )


def build_apple_authorize_url(state: str, request) -> str:
    if not settings.APPLE_CLIENT_ID:
        raise OAuthError("Apple OAuth is not configured")

    query = urlencode(
        {
            "client_id": settings.APPLE_CLIENT_ID,
            "redirect_uri": build_callback_url("apple", request),
            "response_type": "code",
            "response_mode": "form_post",
            "scope": "name email",
            "state": state,
        }
    )
    return f"{APPLE_AUTH_URL}?{query}"


def build_vk_authorize_url(state: str, request) -> str:
    if not settings.VK_CLIENT_ID or not settings.VK_CLIENT_SECRET:
        raise OAuthError("VK OAuth is not configured")

    query = urlencode(
        {
            "client_id": settings.VK_CLIENT_ID,
            "redirect_uri": build_callback_url("vk", request),
            "response_type": "code",
            "scope": "email",
            "v": VK_API_VERSION,
            "state": state,
        }
    )
    return f"{VK_AUTH_URL}?{query}"


async def exchange_google_code(code: str, request) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": build_callback_url("google", request),
                "grant_type": "authorization_code",
            },
        )
        token_response.raise_for_status()
        token_data = token_response.json()

        access_token = token_data.get("access_token")
        if not access_token:
            raise OAuthError("Google access token is missing")

        userinfo_response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        userinfo_response.raise_for_status()
        profile = userinfo_response.json()

    return {
        "provider": "google",
        "provider_subject": profile.get("sub"),
        "email": profile.get("email"),
        "email_verified": bool(profile.get("email_verified")),
        "display_name": profile.get("name"),
        "avatar_url": profile.get("picture"),
    }


async def exchange_apple_code(code: str, request, raw_user_payload: str | None = None) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        token_response = await client.post(
            APPLE_TOKEN_URL,
            data={
                "client_id": settings.APPLE_CLIENT_ID,
                "client_secret": _build_apple_client_secret(),
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": build_callback_url("apple", request),
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        token_response.raise_for_status()
        token_data = token_response.json()

    id_token = token_data.get("id_token")
    if not id_token:
        raise OAuthError("Apple identity token is missing")

    claims = jwt.get_unverified_claims(id_token)
    if claims.get("iss") != "https://appleid.apple.com":
        raise OAuthError("Apple identity token issuer is invalid")
    if claims.get("aud") != settings.APPLE_CLIENT_ID:
        raise OAuthError("Apple identity token audience is invalid")

    email = claims.get("email")
    display_name = None
    if raw_user_payload:
        try:
            user_payload = json.loads(raw_user_payload)
            name_info = user_payload.get("name") or {}
            full_name = " ".join(part for part in [name_info.get("firstName"), name_info.get("lastName")] if part)
            display_name = full_name or None
            email = user_payload.get("email") or email
        except Exception:
            display_name = None

    return {
        "provider": "apple",
        "provider_subject": claims.get("sub"),
        "email": email,
        "email_verified": str(claims.get("email_verified", "false")).lower() == "true",
        "display_name": display_name,
        "avatar_url": None,
    }


async def exchange_vk_code(code: str, request) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        token_response = await client.get(
            VK_TOKEN_URL,
            params={
                "client_id": settings.VK_CLIENT_ID,
                "client_secret": settings.VK_CLIENT_SECRET,
                "redirect_uri": build_callback_url("vk", request),
                "code": code,
            },
        )
        token_response.raise_for_status()
        token_data = token_response.json()

        access_token = token_data.get("access_token")
        user_id = token_data.get("user_id")
        if not access_token or not user_id:
            raise OAuthError("VK access token is missing")

        profile_response = await client.get(
            VK_USERINFO_URL,
            params={
                "user_ids": user_id,
                "fields": "photo_200",
                "access_token": access_token,
                "v": VK_API_VERSION,
            },
        )
        profile_response.raise_for_status()
        profile_data = profile_response.json()

    profile_items = (profile_data.get("response") or [])
    profile = profile_items[0] if profile_items else {}
    display_name = " ".join(part for part in [profile.get("first_name"), profile.get("last_name")] if part) or None
    return {
        "provider": "vk",
        "provider_subject": str(user_id),
        "email": token_data.get("email"),
        "email_verified": bool(token_data.get("email")),
        "display_name": display_name,
        "avatar_url": profile.get("photo_200"),
    }


async def exchange_provider_code(provider: str, code: str, request, raw_user_payload: str | None = None) -> dict:
    if provider == "google":
        return await exchange_google_code(code, request)
    if provider == "apple":
        return await exchange_apple_code(code, request, raw_user_payload=raw_user_payload)
    if provider == "vk":
        return await exchange_vk_code(code, request)
    raise OAuthError("Unsupported OAuth provider")


def resolve_or_create_social_user(
    db: Session,
    *,
    provider: str,
    provider_subject: str,
    email: str | None,
    email_verified: bool,
    display_name: str | None,
    avatar_url: str | None,
    initial_credits: float,
) -> User:
    if not provider_subject:
        raise OAuthError("OAuth provider subject is missing")

    oauth_account = (
        db.query(OAuthAccount)
        .filter(
            OAuthAccount.provider == provider,
            OAuthAccount.provider_subject == provider_subject,
        )
        .first()
    )
    if oauth_account:
        user = db.query(User).filter(User.id == oauth_account.user_id).first()
        if not user:
            raise OAuthError("OAuth account is linked to a missing user")
        if email_verified and not user.is_verified:
            user.is_verified = True
        if display_name and not user.display_name:
            user.display_name = display_name
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url
        db.commit()
        db.refresh(user)
        return user

    normalized_email = email.strip().lower() if email else None
    user = None
    if normalized_email:
        user = db.query(User).filter(func.lower(User.email) == normalized_email).first()

    if user is None:
        if not normalized_email:
            raise OAuthError("The provider did not return an email address")
        user = User(
            email=normalized_email,
            hashed_password=get_password_hash(secrets.token_urlsafe(32)),
            balance=initial_credits if email_verified else 0.0,
            is_verified=bool(email_verified),
            display_name=display_name,
            avatar_url=avatar_url,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if email_verified and not user.is_verified:
            user.is_verified = True
        if display_name and not user.display_name:
            user.display_name = display_name
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url
        db.commit()
        db.refresh(user)

    oauth_account = OAuthAccount(
        user_id=user.id,
        provider=provider,
        provider_subject=provider_subject,
        email=normalized_email,
    )
    db.add(oauth_account)
    db.commit()
    db.refresh(user)
    return user


def create_login_token_for_user(user: User) -> str:
    return create_access_token({"sub": user.email, "pv": user.password_version})


def build_session_bridge_html(token: str, redirect_to: str, locale: str) -> str:
    safe_locale = locale if locale in {"ru", "en"} else "ru"
    safe_redirect = redirect_to if redirect_to.startswith("/") else "/dashboard"
    payload = json.dumps({"token": token, "redirect": safe_redirect, "locale": safe_locale})
    return f"""<!doctype html>
<html lang="{safe_locale}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Signing in…</title>
    <style>
      body {{
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #09090b;
        color: #fff;
        font-family: system-ui, sans-serif;
      }}
      .card {{
        padding: 24px 28px;
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.04);
      }}
    </style>
  </head>
  <body>
    <div class="card">Signing you in…</div>
    <script>
      const payload = {payload};
      fetch('/api/auth/session', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        credentials: 'same-origin',
        body: JSON.stringify({{ token: payload.token }})
      }})
        .then((response) => {{
          if (!response.ok) throw new Error('session_failed');
          window.location.replace(`/${{payload.locale}}${{payload.redirect}}`);
        }})
        .catch(() => {{
          const params = new URLSearchParams({{ social_error: 'session_failed' }});
          window.location.replace(`/${{payload.locale}}/login?${{params.toString()}}`);
        }});
    </script>
  </body>
</html>"""

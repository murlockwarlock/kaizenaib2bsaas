from starlette.requests import Request
from slowapi import Limiter


def _get_real_ip(request: Request) -> str:
    """Extract real client IP behind Cloudflare / reverse proxy."""
    return (
        request.headers.get("CF-Connecting-IP")
        or request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.client.host
        if request.client
        else "127.0.0.1"
    )


limiter = Limiter(key_func=_get_real_ip)

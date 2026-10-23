import os
from pathlib import Path

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.responses import JSONResponse
from sqlalchemy import text
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from core.config import settings
from core.database import engine, Base, run_migrations
from core.rate_limit import limiter
from core.upload_security import guess_safe_content_type, resolve_upload_path
from services.admin_logs import log_admin_event, log_admin_exception

import models.user
import models.task
import models.notification
import models.oauth_account
import models.admin
import models.billing

# Create tables and run incremental migrations
Base.metadata.create_all(bind=engine)
run_migrations()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)


@app.get("/health")
def health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(status_code=503, content={"status": "error", "database": "error"})

    revision_path = Path(__file__).resolve().parents[1] / "REVISION"
    revision = revision_path.read_text(encoding="utf-8").strip() if revision_path.exists() else "unknown"
    return {
        "status": "ok",
        "database": "ok",
        "build_sha": revision,
        "ai_generation_enabled": settings.AI_GENERATION_ENABLED,
        "billing_enabled": settings.BILLING_ENABLED,
    }

# Rate Limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def capture_unhandled_errors(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as exc:
        log_admin_exception(
            scope="api",
            event="unhandled_exception",
            message=f"Unhandled backend exception on {request.method} {request.url.path}",
            exc=exc,
            path=str(request.url.path),
            method=request.method,
        )
        raise


@app.exception_handler(HTTPException)
async def log_http_exception(request: Request, exc: HTTPException):
    is_expected_auth_probe = (
        exc.status_code == 401
        and str(request.url.path).endswith(f"{settings.API_V1_STR}/auth/me")
        and exc.detail == "Not authenticated"
    )
    if exc.status_code >= 400:
        if is_expected_auth_probe:
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail},
                headers=exc.headers,
            )

        log_admin_event_level = "ERROR" if exc.status_code >= 500 else "WARNING"

        log_admin_event(
            level=log_admin_event_level,
            scope="api",
            event="http_exception",
            message=f"HTTP {exc.status_code} on {request.method} {request.url.path}",
            details={"detail": exc.detail, "headers": exc.headers},
            path=str(request.url.path),
            method=request.method,
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def log_validation_exception(request: Request, exc: RequestValidationError):
    log_admin_event(
        level="WARNING",
        scope="api",
        event="request_validation_error",
        message=f"Validation error on {request.method} {request.url.path}",
        details={"errors": exc.errors()},
        path=str(request.url.path),
        method=request.method,
    )
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

from api import auth
from api import generation
from api import uploads
from api import admin
from api import public
from api import billing

@app.get("/")
def read_root():
    return {"message": "Welcome to AI Editor MVP API"}

# Mount uploaded files directory so they can be accessed via URL
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

@app.get(f"/{settings.UPLOAD_DIR}" + "/{file_path:path}")
def read_uploaded_file(file_path: str):
    safe_path = resolve_upload_path(file_path, settings.UPLOAD_DIR)
    return FileResponse(
        safe_path,
        media_type=guess_safe_content_type(safe_path),
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "Cross-Origin-Resource-Policy": "cross-origin",
            "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; media-src 'self'; script-src 'none'; sandbox;",
            "X-Content-Type-Options": "nosniff",
        },
    )

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(generation.router, prefix=f"{settings.API_V1_STR}/ai", tags=["ai"])
app.include_router(uploads.router, prefix=f"{settings.API_V1_STR}/files", tags=["files"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])
app.include_router(public.router, prefix=f"{settings.API_V1_STR}/public", tags=["public"])
app.include_router(billing.router, prefix=f"{settings.API_V1_STR}/billing", tags=["billing"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

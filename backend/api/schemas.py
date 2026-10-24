from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from datetime import datetime

# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str | None = None

# User Schemas
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    utm_code: str | None = None
    utm_source: str | None = None
    utm_medium: str | None = None
    utm_campaign: str | None = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(char.isalpha() for char in value):
            raise ValueError("Password must include at least one letter")
        if not any(char.isdigit() for char in value):
            raise ValueError("Password must include at least one number")
        return value

    @field_validator("utm_code", "utm_source", "utm_medium", "utm_campaign")
    @classmethod
    def normalize_tracking_field(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if len(normalized) > 120:
            raise ValueError("Tracking value is too long")
        return normalized or None

class UserResponse(UserBase):
    id: int
    balance: float
    is_active: bool
    is_verified: bool = False
    is_superuser: bool = False
    display_name: str | None = None
    avatar_url: str | None = None
    moderation_notice: str | None = None
    moderation_required: bool = False

    class Config:
        from_attributes = True


class NotificationResponse(BaseModel):
    id: int
    kind: str
    title: str | None = None
    message: str | None = None
    is_read: bool
    task_id: int | None = None
    metadata: dict | None = None
    read_at: datetime | None = None
    created_at: datetime | None = None


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    unread_count: int


class UserProfileUpdate(BaseModel):
    display_name: str | None = None
    avatar_url: str | None = None

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if len(normalized) > 40:
            raise ValueError("Display name must be 40 characters or fewer")
        return normalized or None

    @field_validator("avatar_url")
    @classmethod
    def validate_avatar_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            return None
        if not (
            normalized.startswith("/uploads/")
            or normalized.startswith("http://")
            or normalized.startswith("https://")
        ):
            raise ValueError("Avatar URL must point to an uploaded image or valid URL")
        return normalized

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    email: EmailStr
    code: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(char.isalpha() for char in value):
            raise ValueError("Password must include at least one letter")
        if not any(char.isdigit() for char in value):
            raise ValueError("Password must include at least one number")
        return value

from typing import Dict, Any, Optional, List

class GenerateRequest(BaseModel):
    category: str = Field(min_length=1, max_length=32)
    model: str = Field(min_length=1, max_length=160)
    inputs: Dict[str, Any] = Field(default_factory=dict)
    resolution: Optional[str] = None
    duration: Optional[int] = None
    is_public: Optional[bool] = False

    @field_validator("category", "model")
    @classmethod
    def normalize_generation_identifier(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Generation category and model cannot be blank")
        return normalized

    @field_validator("inputs")
    @classmethod
    def validate_generation_inputs(cls, value: Dict[str, Any]) -> Dict[str, Any]:
        if len(value) > 100:
            raise ValueError("Too many generation input fields")
        return value

# Admin Schemas
class PromotionCreate(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True

class FAQCreate(BaseModel):
    question: str
    answer: str
    is_active: bool = True
    order_index: int = 0

class ExampleCreate(BaseModel):
    title: str
    category: str
    media_url: str
    prompt: Optional[str] = None
    model: Optional[str] = None
    is_trending: bool = False

class ExampleUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    media_url: Optional[str] = None
    prompt: Optional[str] = None
    model: Optional[str] = None
    is_trending: Optional[bool] = None

class PricingCreate(BaseModel):
    category: Optional[str] = None  # image, video, audio
    model_name: str
    version: Optional[str] = None
    duration: Optional[int] = None
    resolution: Optional[str] = None
    aspect_ratio: Optional[str] = None
    output_format: Optional[str] = None
    num_images: Optional[int] = None
    google_search: Optional[bool] = None
    reference_count: Optional[int] = None
    generation_mode: Optional[str] = None
    acceleration: Optional[str] = None
    frame_count: Optional[int] = None
    sound_enabled: Optional[bool] = None
    remove_watermark: Optional[bool] = None
    cost: float = 1.0
    is_active: bool = True

class PricingUpdate(BaseModel):
    category: Optional[str] = None
    model_name: Optional[str] = None
    version: Optional[str] = None
    duration: Optional[int] = None
    resolution: Optional[str] = None
    aspect_ratio: Optional[str] = None
    output_format: Optional[str] = None
    num_images: Optional[int] = None
    google_search: Optional[bool] = None
    reference_count: Optional[int] = None
    generation_mode: Optional[str] = None
    acceleration: Optional[str] = None
    frame_count: Optional[int] = None
    sound_enabled: Optional[bool] = None
    remove_watermark: Optional[bool] = None
    cost: Optional[float] = None
    is_active: Optional[bool] = None

class PricingPlanCreate(BaseModel):
    name_ru: str
    name_en: str
    description_ru: Optional[str] = None
    description_en: Optional[str] = None
    badge_ru: Optional[str] = None
    badge_en: Optional[str] = None
    billing_period_ru: Optional[str] = None
    billing_period_en: Optional[str] = None
    cta_label_ru: Optional[str] = None
    cta_label_en: Optional[str] = None
    cta_url: Optional[str] = None
    features_ru: Optional[str] = None
    features_en: Optional[str] = None
    currency_symbol: str = "$"
    price: float = 0.0
    credits: int = 0
    is_recurring: bool = False
    recurring_days: int = 30
    is_featured: bool = False
    is_active: bool = True
    sort_order: int = 0

class PricingPlanUpdate(BaseModel):
    name_ru: Optional[str] = None
    name_en: Optional[str] = None
    description_ru: Optional[str] = None
    description_en: Optional[str] = None
    badge_ru: Optional[str] = None
    badge_en: Optional[str] = None
    billing_period_ru: Optional[str] = None
    billing_period_en: Optional[str] = None
    cta_label_ru: Optional[str] = None
    cta_label_en: Optional[str] = None
    cta_url: Optional[str] = None
    features_ru: Optional[str] = None
    features_en: Optional[str] = None
    currency_symbol: Optional[str] = None
    price: Optional[float] = None
    credits: Optional[int] = None
    is_recurring: Optional[bool] = None
    recurring_days: Optional[int] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class PlanInviteBulkCreate(BaseModel):
    pricing_plan_id: int
    emails: List[EmailStr]
    expires_in_days: Optional[int] = None

    @field_validator("emails")
    @classmethod
    def validate_emails(cls, value: List[EmailStr]) -> List[EmailStr]:
        normalized: list[str] = []
        seen: set[str] = set()
        for item in value:
            email = str(item).strip().lower()
            if email and email not in seen:
                seen.add(email)
                normalized.append(email)
        if not normalized:
            raise ValueError("At least one email is required")
        return normalized  # type: ignore[return-value]

    @field_validator("expires_in_days")
    @classmethod
    def validate_expires_in_days(cls, value: Optional[int]) -> Optional[int]:
        if value is not None and value < 1:
            raise ValueError("expires_in_days must be greater than 0")
        return value


class PlanInviteClaimRequest(BaseModel):
    token: str


class UTMTrackingLinkCreate(BaseModel):
    code: str
    target_path: str | None = "/ru/register"
    note: str | None = None

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not normalized:
            raise ValueError("Code is required")
        if len(normalized) > 64:
            raise ValueError("Code must be 64 characters or fewer")
        return normalized

    @field_validator("target_path")
    @classmethod
    def normalize_target_path(cls, value: str | None) -> str:
        normalized = (value or "/ru/register").strip()
        if not normalized:
            normalized = "/ru/register"
        if not normalized.startswith("/"):
            normalized = f"/{normalized}"
        return normalized

    @field_validator("note")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

class SettingsUpdate(BaseModel):
    settings: Dict[str, str]

class FeedbackSchema(BaseModel):
    message: str


class PromoCodeBase(BaseModel):
    code: str
    description: Optional[str] = None
    discount_percent: float
    max_total_uses: Optional[int] = None
    max_uses_per_user: int = 1
    is_active: bool = True
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None


class PromoCodeCreate(PromoCodeBase):
    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        normalized = value.strip().upper()
        if not normalized:
            raise ValueError("Promo code is required")
        return normalized


class PromoCodeUpdate(BaseModel):
    description: Optional[str] = None
    discount_percent: Optional[float] = None
    max_total_uses: Optional[int] = None
    max_uses_per_user: Optional[int] = None
    is_active: Optional[bool] = None
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None


class CheckoutQuoteRequest(BaseModel):
    purchase_type: str = "plan"
    plan_id: Optional[int] = None
    amount_rub: Optional[float] = None
    promo_code: Optional[str] = None

    @model_validator(mode="after")
    def validate_checkout_target(self):
        purchase_type = (self.purchase_type or "plan").strip().lower()
        if purchase_type not in {"plan", "credit_pack"}:
            raise ValueError("Unsupported purchase type")
        self.purchase_type = purchase_type

        if purchase_type == "plan":
            if self.plan_id is None:
                raise ValueError("plan_id is required for plan checkout")
            self.amount_rub = None
        else:
            if self.amount_rub is None or self.amount_rub <= 0:
                raise ValueError("amount_rub must be greater than 0 for credit pack checkout")
            self.plan_id = None
        return self


class CheckoutCreateRequest(CheckoutQuoteRequest):
    locale: str = "ru"
    enable_recurring: bool = False


class SubscriptionCancelRequest(BaseModel):
    cancel_now: bool = False

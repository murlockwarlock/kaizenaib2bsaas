from sqlalchemy import Column, Integer, String, Boolean, Text, Float, DateTime
from sqlalchemy.sql import func
from core.database import Base

class Promotion(Base):
    __tablename__ = "promotions"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

class Banner(Base):
    __tablename__ = "banners"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    subtitle = Column(String, nullable=True) # e.g. "Special Offer" or "New Feature"
    image_url = Column(String, nullable=True)
    target_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

class FAQ(Base):
    __tablename__ = "faqs"
    id = Column(Integer, primary_key=True, index=True)
    question = Column(String, index=True)
    answer = Column(Text)
    is_active = Column(Boolean, default=True)
    order_index = Column(Integer, default=0)

class GenerationExample(Base):
    __tablename__ = "generation_examples"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    category = Column(String, index=True) # video, image, audio
    media_url = Column(String)
    prompt = Column(Text, nullable=True)
    model = Column(String, nullable=True)
    is_trending = Column(Boolean, default=False)

class SiteSetting(Base):
    __tablename__ = "site_settings"
    key = Column(String, primary_key=True, index=True)
    value = Column(Text)

class Feedback(Base):
    __tablename__ = "feedbacks"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=True)
    message = Column(Text)

class ModelPricing(Base):
    __tablename__ = "model_pricing"
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, nullable=True, index=True)  # image, video, audio
    model_name = Column(String, index=True)  # e.g. "Kling 1.5" or "Midjourney"
    version = Column(String, nullable=True)  # e.g. "Pro", "Standard"
    duration = Column(Integer, nullable=True)  # e.g. 5, 10 (seconds)
    resolution = Column(String, nullable=True)  # e.g. "1080p", "720p"
    aspect_ratio = Column(String, nullable=True)
    output_format = Column(String, nullable=True)
    num_images = Column(Integer, nullable=True)
    google_search = Column(Boolean, nullable=True)
    reference_count = Column(Integer, nullable=True)
    generation_mode = Column(String, nullable=True)
    acceleration = Column(String, nullable=True)
    frame_count = Column(Integer, nullable=True)
    sound_enabled = Column(Boolean, nullable=True)
    remove_watermark = Column(Boolean, nullable=True)
    cost = Column(Float, default=1.0)
    is_active = Column(Boolean, default=True)

class FeaturedAudio(Base):
    __tablename__ = "featured_audio"
    id = Column(Integer, primary_key=True, index=True)
    source_task_id = Column(Integer, nullable=True, index=True)
    title = Column(String, index=True)
    subtitle = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    prompt = Column(Text, nullable=True)
    audio_url = Column(String, nullable=False)
    cover_image_url = Column(String, nullable=True)
    model = Column(String, nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PricingPlan(Base):
    __tablename__ = "pricing_plans"
    id = Column(Integer, primary_key=True, index=True)
    name_ru = Column(String, nullable=False)
    name_en = Column(String, nullable=False)
    description_ru = Column(Text, nullable=True)
    description_en = Column(Text, nullable=True)
    badge_ru = Column(String, nullable=True)
    badge_en = Column(String, nullable=True)
    billing_period_ru = Column(String, nullable=True)
    billing_period_en = Column(String, nullable=True)
    cta_label_ru = Column(String, nullable=True)
    cta_label_en = Column(String, nullable=True)
    cta_url = Column(String, nullable=True)
    features_ru = Column(Text, nullable=True)
    features_en = Column(Text, nullable=True)
    currency_symbol = Column(String, nullable=False, default="$")
    price = Column(Float, nullable=False, default=0.0)
    credits = Column(Integer, nullable=False, default=0)
    is_recurring = Column(Boolean, default=False)
    recurring_days = Column(Integer, default=30)
    is_featured = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AdminLog(Base):
    __tablename__ = "admin_logs"
    id = Column(Integer, primary_key=True, index=True)
    level = Column(String, nullable=False, index=True)
    scope = Column(String, nullable=False, index=True)
    event = Column(String, nullable=True, index=True)
    message = Column(Text, nullable=False)
    details = Column(Text, nullable=True)
    path = Column(String, nullable=True)
    method = Column(String, nullable=True)
    task_id = Column(Integer, nullable=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

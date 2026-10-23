from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.sql import func
from core.database import Base

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    task_id_vendor = Column(String, index=True, nullable=True) # ID от kie.ai
    tool_type = Column(String, index=True) # например: upscale, remove_bg
    category = Column(String, nullable=True) # например: video, image, audio
    model = Column(String, nullable=True) # например: image-to-video-v1
    resolution = Column(String, nullable=True) # например: 1080p
    duration = Column(Integer, nullable=True) # например: 5 (секунд)
    is_public = Column(Boolean, default=False)
    status = Column(String, default="pending") # pending, processing, success, failed
    provider_status = Column(String, nullable=True)
    input_url = Column(String, nullable=True)
    output_url = Column(String, nullable=True)
    prompt = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    error_details = Column(Text, nullable=True)
    settings_snapshot_json = Column(Text, nullable=True)
    view_count = Column(Integer, default=0)
    cost = Column(Float, default=0.0)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    credits_refunded_at = Column(DateTime(timezone=True), nullable=True)
    credits_refund_reason = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

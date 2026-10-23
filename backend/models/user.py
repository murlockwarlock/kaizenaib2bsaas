from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, index=True, nullable=True)
    avatar_url = Column(String, nullable=True)
    utm_code = Column(String, index=True, nullable=True)
    utm_source = Column(String, nullable=True)
    utm_medium = Column(String, nullable=True)
    utm_campaign = Column(String, nullable=True)
    utm_link_id = Column(Integer, ForeignKey("utm_tracking_links.id"), index=True, nullable=True)
    utm_attributed_at = Column(DateTime(timezone=True), nullable=True)
    moderation_notice = Column(String, nullable=True)
    moderation_required = Column(Boolean, default=False, nullable=False)
    hashed_password = Column(String, nullable=False)
    balance = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_superuser = Column(Boolean, default=False)
    password_version = Column(Integer, default=0, nullable=False, server_default="0")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Like(Base):
    __tablename__ = "likes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    task_id = Column(Integer, ForeignKey("tasks.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

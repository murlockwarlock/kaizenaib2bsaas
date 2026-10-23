import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
from models.admin import Promotion, Banner, FAQ, GenerationExample, ModelPricing, FeaturedAudio, PricingPlan
from models.task import Task
from models.admin import SiteSetting
from models.user import Like, User
from sqlalchemy import func

router = APIRouter()


def _parse_settings_snapshot(value: str | None):
    if not value:
        return None
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        return None


def _serialize_public_task(task: Task, *, user: User, like_count: int) -> dict:
    row = {c.name: getattr(task, c.name) for c in task.__table__.columns}
    row["like_count"] = like_count
    row["likes_count"] = like_count
    row["author_id"] = user.id
    row["author_display_name"] = user.display_name
    row["author_avatar_url"] = user.avatar_url
    row["author_email"] = user.email
    row["settings_snapshot"] = _parse_settings_snapshot(task.settings_snapshot_json)
    return row

@router.get("/promotions")
def get_public_promotions(db: Session = Depends(get_db)):
    return db.query(Promotion).filter(Promotion.is_active == True).all()

@router.get("/banners")
def get_public_banners(db: Session = Depends(get_db)):
    return db.query(Banner).filter(Banner.is_active == True).all()

@router.get("/faqs")
def get_public_faqs(db: Session = Depends(get_db)):
    return db.query(FAQ).filter(FAQ.is_active == True).order_by(FAQ.order_index).all()

@router.get("/examples")
def get_public_examples(db: Session = Depends(get_db)):
    return (
        db.query(GenerationExample)
        .filter(GenerationExample.is_trending == True)
        .order_by(GenerationExample.id.desc())
        .all()
    )

@router.get("/settings")
def get_public_settings(db: Session = Depends(get_db)):
    all_settings = db.query(SiteSetting).all()
    # Expose everything except AI backend prompts
    return {s.key: s.value for s in all_settings if not s.key.startswith("prompt_")}

@router.get("/prices")
def get_public_prices(db: Session = Depends(get_db)):
    return db.query(ModelPricing).filter(ModelPricing.is_active == True).all()

@router.get("/featured-audio")
def get_public_featured_audio(db: Session = Depends(get_db)):
    return (
        db.query(FeaturedAudio)
        .filter(FeaturedAudio.is_active == True)
        .order_by(FeaturedAudio.sort_order.asc(), FeaturedAudio.id.desc())
        .all()
    )

@router.get("/pricing-plans")
def get_public_pricing_plans(db: Session = Depends(get_db)):
    return (
        db.query(PricingPlan)
        .filter(PricingPlan.is_active == True)
        .order_by(PricingPlan.is_featured.desc(), PricingPlan.sort_order.asc(), PricingPlan.id.asc())
        .all()
    )

@router.get("/tasks")
def get_public_tasks(db: Session = Depends(get_db)):
    # Get hot threshold from settings (default 2 likes = Hot)
    threshold_setting = db.query(SiteSetting).filter(SiteSetting.key == "hot_threshold").first()
    try:
        hot_threshold = int(threshold_setting.value) if threshold_setting else 2
    except (ValueError, TypeError):
        hot_threshold = 2

    rows = (
        db.query(Task, User, func.count(Like.id).label("like_count"))
        .join(User, Task.user_id == User.id)
        .outerjoin(Like, Task.id == Like.task_id)
        .filter(Task.is_public == True, Task.status == "success")
        .group_by(Task.id, User.id)
        .order_by(func.count(Like.id).desc(), Task.created_at.desc())
        .limit(40)
        .all()
    )

    result = []
    for task, user, like_count in rows:
        row = _serialize_public_task(task, user=user, like_count=like_count)
        row["is_hot"] = like_count >= hot_threshold
        result.append(row)
    return result


@router.post("/tasks/{task_id}/view")
def increment_public_task_view(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.is_public == True, Task.status == "success").first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.view_count = int(task.view_count or 0) + 1
    db.commit()
    return {"status": "success", "view_count": task.view_count}


@router.get("/profiles/{user_id}")
def get_public_profile(user_id: int, category: str = "all", db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    rows = (
        db.query(Task, func.count(Like.id).label("like_count"))
        .outerjoin(Like, Task.id == Like.task_id)
        .filter(Task.user_id == user_id, Task.is_public == True, Task.status == "success")
        .group_by(Task.id)
        .all()
    )

    serialized_tasks = [_serialize_public_task(task, user=user, like_count=like_count) for task, like_count in rows]

    def category_matches(task_row: dict, value: str) -> bool:
        task_category = task_row.get("category")
        if value == "image":
            return task_category in {"image", "images"}
        if value == "all":
            return True
        return task_category == value

    filtered_tasks = [task for task in serialized_tasks if category_matches(task, category)]
    filtered_tasks.sort(
        key=lambda item: (
            int(item.get("likes_count") or 0),
            int(item.get("view_count") or 0),
            item.get("created_at") or "",
        ),
        reverse=True,
    )

    counts = {
        "all": len(serialized_tasks),
        "image": sum(1 for task in serialized_tasks if task.get("category") in {"image", "images"}),
        "video": sum(1 for task in serialized_tasks if task.get("category") == "video"),
        "audio": sum(1 for task in serialized_tasks if task.get("category") == "audio"),
    }

    total_likes = sum(int(task.get("likes_count") or 0) for task in serialized_tasks)
    total_views = sum(int(task.get("view_count") or 0) for task in serialized_tasks)

    return {
        "profile": {
            "id": user.id,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
        },
        "stats": {
            "posts": counts["all"],
            "likes": total_likes,
            "views": total_views,
            "counts": counts,
        },
        "tasks": filtered_tasks,
        "top_tasks": filtered_tasks[:3],
    }

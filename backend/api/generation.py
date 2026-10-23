import json

from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, Query, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Any
from core.database import get_db
from core.config import settings
from core.upload_security import is_valid_shared_secret
from models.user import User, Like
from models.task import Task
from models.admin import Feedback, ModelPricing
from api.deps import get_current_active_user, get_current_verified_user
from services.kie_ai import request_kie_generation, check_task_status, normalize_elevenlabs_inputs
from api.schemas import GenerateRequest, FeedbackSchema
from core.rate_limit import limiter
from services.admin_logs import log_admin_event, log_admin_exception
from services.generation_refunds import refund_task_credits_once
from services.notifications import create_generation_notification
from utils.prompt_safety import find_prompt_safety_issue

def require_generation_enabled():
    if not settings.AI_GENERATION_ENABLED:
        raise HTTPException(status_code=503, detail="AI generation is disabled until provider access is configured")


router = APIRouter(dependencies=[Depends(require_generation_enabled)])

NANOBANANA_MODEL = "nano-banana-2"
NANOBANANA_PRO_MODEL = "nano-banana-pro"
GOOGLE_NANO_BANANA_MODEL = "google/nano-banana"
GOOGLE_NANO_BANANA_EDIT_MODEL = "google/nano-banana-edit"
GOOGLE_IMAGEN_MODELS = {"google/imagen4", "google/imagen4-fast", "google/imagen4-ultra"}
HAILUO_IMAGE_TO_VIDEO_MODEL = "hailuo/2-3-image-to-video-pro"
HAILUO_IMAGE_TO_VIDEO_STANDARD_MODEL = "hailuo/2-3-image-to-video-standard"
HAILUO_02_TEXT_PRO_MODEL = "hailuo/02-text-to-video-pro"
HAILUO_02_IMAGE_PRO_MODEL = "hailuo/02-image-to-video-pro"
HAILUO_02_TEXT_STANDARD_MODEL = "hailuo/02-text-to-video-standard"
HAILUO_02_IMAGE_STANDARD_MODEL = "hailuo/02-image-to-video-standard"
BYTEDANCE_SEEDANCE_MODEL = "bytedance/seedance-1-5-pro"
BYTEDANCE_V1_PRO_FAST_IMAGE_MODEL = "bytedance/v1-pro-fast-image-to-video"
BYTEDANCE_V1_PRO_IMAGE_MODEL = "bytedance/v1-pro-image-to-video"
BYTEDANCE_V1_PRO_TEXT_MODEL = "bytedance/v1-pro-text-to-video"
BYTEDANCE_V1_LITE_IMAGE_MODEL = "bytedance/v1-lite-image-to-video"
BYTEDANCE_V1_LITE_TEXT_MODEL = "bytedance/v1-lite-text-to-video"
WAN_26_IMAGE_MODEL = "wan/2-6-image-to-video"
WAN_26_TEXT_MODEL = "wan/2-6-text-to-video"
WAN_26_VIDEO_MODEL = "wan/2-6-video-to-video"
WAN_22_IMAGE_TURBO_MODEL = "wan/2-2-a14b-image-to-video-turbo"
WAN_22_TEXT_TURBO_MODEL = "wan/2-2-a14b-text-to-video-turbo"
WAN_22_SPEECH_TURBO_MODEL = "wan/2-2-a14b-speech-to-video-turbo"
WAN_22_ANIMATE_MOVE_MODEL = "wan/2-2-animate-move"
WAN_22_ANIMATE_REPLACE_MODEL = "wan/2-2-animate-replace"
WAN_26_FLASH_IMAGE_MODEL = "wan/2-6-flash-image-to-video"
WAN_26_FLASH_VIDEO_MODEL = "wan/2-6-flash-video-to-video"
RUNWAY_GENERATE_MODEL = "runway/generate"
RUNWAY_EXTEND_MODEL = "runway/extend"
RUNWAY_ALEPH_GENERATE_MODEL = "runway/aleph-generate"
KLING_26_TEXT_MODEL = "kling-2.6/text-to-video"
KLING_26_IMAGE_MODEL = "kling-2.6/image-to-video"
KLING_V21_MASTER_IMAGE_MODEL = "kling/v2-1-master-image-to-video"
KLING_V25_TURBO_TEXT_MODEL = "kling/v2-5-turbo-text-to-video-pro"
KLING_AI_AVATAR_MODELS = {"kling/ai-avatar-standard", "kling/ai-avatar-pro"}
KLING_3_MOTION_MODEL = "kling-3/motion-control"
KLING_30_VIDEO_MODEL = "kling-3.0/video"
VEO_31_TEXT_FAST_MODEL = "veo-3.1/text-fast"
VEO_31_TEXT_QUALITY_MODEL = "veo-3.1/text-quality"
VEO_31_IMAGE_FAST_MODEL = "veo-3.1/image-fast"
VEO_31_IMAGE_QUALITY_MODEL = "veo-3.1/image-quality"
VEO_31_REFERENCE_FAST_MODEL = "veo-3.1/reference-fast"
VEO_31_EXTEND_FAST_MODEL = "veo-3.1/extend-fast"
VEO_31_EXTEND_QUALITY_MODEL = "veo-3.1/extend-quality"
SORA_2_TEXT_MODEL = "sora-2-text-to-video"
SORA_2_IMAGE_MODEL = "sora-2-image-to-video"
SORA_2_PRO_TEXT_MODEL = "sora-2-pro-text-to-video"
SORA_2_PRO_IMAGE_MODEL = "sora-2-pro-image-to-video"
SORA_2_PRO_STORYBOARD_MODEL = "sora-2-pro-storyboard"
SORA_WATERMARK_REMOVER_MODEL = "sora-watermark-remover"
SORA_2_CHARACTERS_MODEL = "sora-2-characters"
SORA_2_CHARACTERS_PRO_MODEL = "sora-2-characters-pro"
VIDEO_IMAGE_ARRAY_MODELS = {
    KLING_26_IMAGE_MODEL,
    SORA_2_IMAGE_MODEL,
    SORA_2_PRO_IMAGE_MODEL,
    SORA_2_PRO_STORYBOARD_MODEL,
}
VIDEO_IMAGE_SINGLE_MODELS = {HAILUO_IMAGE_TO_VIDEO_MODEL, KLING_V21_MASTER_IMAGE_MODEL}
VIDEO_AUDIO_MODELS = set(KLING_AI_AVATAR_MODELS)
VIDEO_VIDEO_MODELS = {KLING_3_MOTION_MODEL, SORA_WATERMARK_REMOVER_MODEL, SORA_2_CHARACTERS_MODEL}
VIDEO_SPECIAL_MODELS = (
    VIDEO_IMAGE_ARRAY_MODELS
    | VIDEO_IMAGE_SINGLE_MODELS
    | VIDEO_AUDIO_MODELS
    | VIDEO_VIDEO_MODELS
    | {
        KLING_26_TEXT_MODEL,
        KLING_V25_TURBO_TEXT_MODEL,
        KLING_30_VIDEO_MODEL,
        VEO_31_TEXT_FAST_MODEL,
        VEO_31_TEXT_QUALITY_MODEL,
        VEO_31_IMAGE_FAST_MODEL,
        VEO_31_IMAGE_QUALITY_MODEL,
        VEO_31_REFERENCE_FAST_MODEL,
        VEO_31_EXTEND_FAST_MODEL,
        VEO_31_EXTEND_QUALITY_MODEL,
        BYTEDANCE_SEEDANCE_MODEL,
        BYTEDANCE_V1_PRO_FAST_IMAGE_MODEL,
        BYTEDANCE_V1_PRO_IMAGE_MODEL,
        BYTEDANCE_V1_PRO_TEXT_MODEL,
        BYTEDANCE_V1_LITE_IMAGE_MODEL,
        BYTEDANCE_V1_LITE_TEXT_MODEL,
        HAILUO_IMAGE_TO_VIDEO_STANDARD_MODEL,
        HAILUO_02_TEXT_PRO_MODEL,
        HAILUO_02_IMAGE_PRO_MODEL,
        HAILUO_02_TEXT_STANDARD_MODEL,
        HAILUO_02_IMAGE_STANDARD_MODEL,
        WAN_26_IMAGE_MODEL,
        WAN_26_TEXT_MODEL,
        WAN_26_VIDEO_MODEL,
        WAN_22_IMAGE_TURBO_MODEL,
        WAN_22_TEXT_TURBO_MODEL,
        WAN_22_SPEECH_TURBO_MODEL,
        WAN_22_ANIMATE_MOVE_MODEL,
        WAN_22_ANIMATE_REPLACE_MODEL,
        WAN_26_FLASH_IMAGE_MODEL,
        WAN_26_FLASH_VIDEO_MODEL,
        RUNWAY_GENERATE_MODEL,
        RUNWAY_EXTEND_MODEL,
        RUNWAY_ALEPH_GENERATE_MODEL,
        SORA_2_TEXT_MODEL,
        SORA_2_PRO_TEXT_MODEL,
        SORA_2_CHARACTERS_PRO_MODEL,
    }
)
NANOBANANA_ASPECT_RATIOS = {
    "1:1", "1:4", "1:8", "2:3", "3:2", "3:4", "4:1",
    "4:3", "4:5", "5:4", "8:1", "9:16", "16:9", "21:9", "auto",
}
NANOBANANA_RESOLUTIONS = {"1K", "2K", "4K"}
GOOGLE_NANO_IMAGE_SIZES = {"1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "5:4", "4:5", "21:9", "auto"}
GOOGLE_NANO_EDIT_IMAGE_SIZES = GOOGLE_NANO_IMAGE_SIZES
GOOGLE_IMAGEN_ASPECT_RATIOS = {"1:1", "16:9", "9:16", "3:4", "4:3"}
STANDARD_VIDEO_ASPECT_RATIOS = {"1:1", "16:9", "9:16"}
RUNWAY_ASPECT_RATIOS = {"1:1", "4:3", "3:4", "9:16", "16:9"}
VEO_ASPECT_RATIOS = {"16:9", "9:16"}
VEO_DURATIONS = {"5", "8"}
BYTEDANCE_SEEDANCE_DURATIONS = {"8", "10"}
BYTEDANCE_V1_PRO_DURATIONS = {"5", "10"}
SORA_ASPECT_RATIOS = {"portrait", "landscape"}
SORA_FRAME_COUNTS = {"10", "15"}
SORA_STORYBOARD_FRAME_COUNTS = {"10", "15", "25"}


def _coerce_str_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def _coerce_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"1", "true", "yes", "on"}:
            return True
        if lowered in {"0", "false", "no", "off"}:
            return False
    return default


def _coerce_int(value: Any, default: int | None = None) -> int | None:
    if isinstance(value, bool):
        return default
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        stripped = value.strip()
        if stripped.startswith("-"):
            if stripped[1:].isdigit():
                return int(stripped)
        elif stripped.isdigit():
            return int(stripped)
    return default


def _coerce_float(value: Any, default: float | None = None) -> float | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.strip())
        except ValueError:
            return default
    return default


def _unique_urls(*values: Any) -> list[str]:
    collected: list[str] = []
    for value in values:
        collected.extend(_coerce_str_list(value))
    return list(dict.fromkeys(collected))


def _absolutize_public_asset_url(value: str | None) -> str | None:
    normalized = str(value or "").strip()
    if not normalized:
        return None
    if normalized.startswith(("http://", "https://", "data:")):
        return normalized
    if normalized.startswith("/uploads/"):
        return f"{settings.public_base_url}{normalized}" if settings.public_base_url else normalized
    if normalized.startswith("uploads/"):
        return f"{settings.public_base_url}/{normalized}" if settings.public_base_url else f"/{normalized}"
    return normalized


def _normalize_public_asset_inputs(value: Any):
    if isinstance(value, str):
        return _absolutize_public_asset_url(value) or value
    if isinstance(value, list):
        return [_normalize_public_asset_inputs(item) for item in value]
    if isinstance(value, dict):
        return {key: _normalize_public_asset_inputs(item) for key, item in value.items()}
    return value


def _parse_timestamp_range(value: Any) -> tuple[float, float] | None:
    raw = str(value or "").strip()
    if not raw:
        return None
    parts = [part.strip() for part in raw.split(",", 1)]
    if len(parts) != 2:
        return None
    try:
        start = float(parts[0])
        end = float(parts[1])
    except ValueError:
        return None
    if start < 0 or end <= start:
        return None
    return start, end


def _collect_reference_sources(mapped_inputs: dict[str, Any]) -> list[str]:
    return _unique_urls(
        mapped_inputs.get("image_input"),
        mapped_inputs.get("image_urls"),
        mapped_inputs.get("input_urls"),
        mapped_inputs.get("reference_image_urls"),
        mapped_inputs.get("image_url"),
        mapped_inputs.get("image"),
        mapped_inputs.get("video_urls"),
        mapped_inputs.get("video_url"),
        mapped_inputs.get("audio_url"),
        mapped_inputs.get("character_file_url"),
    )


def _normalize_video_inputs(mapped_model: str, mapped_inputs: dict[str, Any], gen_request: GenerateRequest):
    def require_prompt() -> str:
        prompt_value = str(mapped_inputs.get("prompt") or "").strip()
        if not prompt_value:
            raise HTTPException(status_code=400, detail="Prompt is required for this video model")
        return prompt_value

    if mapped_model in {HAILUO_IMAGE_TO_VIDEO_MODEL, HAILUO_IMAGE_TO_VIDEO_STANDARD_MODEL}:
        reference_image = (
            mapped_inputs.get("image_url")
            or mapped_inputs.get("image")
            or (_coerce_str_list(mapped_inputs.get("input_urls"))[0] if _coerce_str_list(mapped_inputs.get("input_urls")) else None)
            or (_coerce_str_list(mapped_inputs.get("image_urls"))[0] if _coerce_str_list(mapped_inputs.get("image_urls")) else None)
        )
        if not reference_image:
            raise HTTPException(status_code=400, detail="Reference image is required for image-to-video generation")
        mapped_inputs["prompt"] = require_prompt()
        mapped_inputs["image_url"] = str(reference_image)
        mapped_inputs["duration"] = "6"
        mapped_inputs["resolution"] = "768P"
        for key in ("image", "input_urls", "image_urls"):
            mapped_inputs.pop(key, None)
        mapped_inputs.pop("aspect_ratio", None)
        return mapped_inputs

    if mapped_model in {HAILUO_02_TEXT_PRO_MODEL, HAILUO_02_TEXT_STANDARD_MODEL}:
        mapped_inputs["prompt"] = require_prompt()
        mapped_inputs["prompt_optimizer"] = _coerce_bool(mapped_inputs.get("prompt_optimizer"), True)
        if mapped_model == HAILUO_02_TEXT_STANDARD_MODEL:
            mapped_inputs["duration"] = "6"
        else:
            mapped_inputs.pop("duration", None)
        mapped_inputs.pop("resolution", None)
        mapped_inputs.pop("aspect_ratio", None)
        return mapped_inputs

    if mapped_model in {HAILUO_02_IMAGE_PRO_MODEL, HAILUO_02_IMAGE_STANDARD_MODEL}:
        mapped_inputs["prompt"] = require_prompt()
        image_url = (_unique_urls(mapped_inputs.get("image_url"), mapped_inputs.get("image"), mapped_inputs.get("image_urls"), mapped_inputs.get("input_urls")) or [None])[0]
        if not image_url:
            raise HTTPException(status_code=400, detail="Reference image is required for this model")
        mapped_inputs["image_url"] = image_url
        end_image_url = (_unique_urls(mapped_inputs.get("end_image_url")) or [None])[0]
        if end_image_url:
            mapped_inputs["end_image_url"] = end_image_url
        else:
            mapped_inputs.pop("end_image_url", None)
        mapped_inputs["prompt_optimizer"] = _coerce_bool(mapped_inputs.get("prompt_optimizer"), True)
        if mapped_model == HAILUO_02_IMAGE_STANDARD_MODEL:
            mapped_inputs["duration"] = "10"
            mapped_inputs["resolution"] = "768P"
        else:
            mapped_inputs.pop("duration", None)
            mapped_inputs.pop("resolution", None)
        mapped_inputs.pop("aspect_ratio", None)
        for key in ("image", "image_urls", "input_urls"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model == BYTEDANCE_SEEDANCE_MODEL:
        mapped_inputs["prompt"] = require_prompt()
        input_urls = _unique_urls(mapped_inputs.get("input_urls"), mapped_inputs.get("image_urls"), mapped_inputs.get("image"), mapped_inputs.get("image_url"))
        if input_urls:
            mapped_inputs["input_urls"] = input_urls[:2]
        else:
            mapped_inputs.pop("input_urls", None)
        duration = str(_coerce_int(mapped_inputs.get("duration"), gen_request.duration or 8) or 8)
        if duration not in BYTEDANCE_SEEDANCE_DURATIONS:
            raise HTTPException(status_code=400, detail="Bytedance Seedance supports only 8s or 10s duration")
        mapped_inputs["duration"] = duration
        aspect_ratio = str(mapped_inputs.get("aspect_ratio") or gen_request.resolution or "16:9").strip()
        mapped_inputs["aspect_ratio"] = aspect_ratio if aspect_ratio in STANDARD_VIDEO_ASPECT_RATIOS else "16:9"
        resolution = str(mapped_inputs.get("resolution") or gen_request.resolution or "1080p").strip().lower()
        mapped_inputs["resolution"] = "720p" if resolution == "720p" else "1080p"
        mapped_inputs["fixed_lens"] = _coerce_bool(mapped_inputs.get("fixed_lens"), False)
        mapped_inputs["generate_audio"] = _coerce_bool(mapped_inputs.get("generate_audio"), False)
        for key in ("image", "image_url", "image_urls"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model == BYTEDANCE_V1_PRO_FAST_IMAGE_MODEL:
        mapped_inputs["prompt"] = require_prompt()
        image_url = (_unique_urls(mapped_inputs.get("image_url"), mapped_inputs.get("image"), mapped_inputs.get("image_urls"), mapped_inputs.get("input_urls")) or [None])[0]
        if not image_url:
            raise HTTPException(status_code=400, detail="Reference image is required for this model")
        mapped_inputs["image_url"] = image_url
        mapped_inputs["duration"] = "5"
        mapped_inputs["resolution"] = "720p"
        mapped_inputs.pop("aspect_ratio", None)
        for key in ("image", "image_urls", "input_urls"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model == BYTEDANCE_V1_PRO_IMAGE_MODEL:
        mapped_inputs["prompt"] = require_prompt()
        image_url = (_unique_urls(mapped_inputs.get("image_url"), mapped_inputs.get("image"), mapped_inputs.get("image_urls"), mapped_inputs.get("input_urls")) or [None])[0]
        if not image_url:
            raise HTTPException(status_code=400, detail="Reference image is required for this model")
        mapped_inputs["image_url"] = image_url
        duration = str(_coerce_int(mapped_inputs.get("duration"), gen_request.duration or 5) or 5)
        mapped_inputs["duration"] = duration if duration in BYTEDANCE_V1_PRO_DURATIONS else "5"
        resolution = str(mapped_inputs.get("resolution") or gen_request.resolution or "1080p").strip().lower()
        mapped_inputs["resolution"] = "720p" if resolution == "720p" else "1080p"
        mapped_inputs["camera_fixed"] = _coerce_bool(mapped_inputs.get("camera_fixed"), False)
        mapped_inputs["enable_safety_checker"] = _coerce_bool(mapped_inputs.get("enable_safety_checker"), True)
        seed = _coerce_int(mapped_inputs.get("seed"))
        if seed is None:
            mapped_inputs.pop("seed", None)
        else:
            mapped_inputs["seed"] = seed
        mapped_inputs.pop("aspect_ratio", None)
        for key in ("image", "image_urls", "input_urls"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model == BYTEDANCE_V1_PRO_TEXT_MODEL:
        mapped_inputs["prompt"] = require_prompt()
        duration = str(_coerce_int(mapped_inputs.get("duration"), gen_request.duration or 5) or 5)
        mapped_inputs["duration"] = duration if duration in BYTEDANCE_V1_PRO_DURATIONS else "5"
        resolution = str(mapped_inputs.get("resolution") or gen_request.resolution or "1080p").strip().lower()
        mapped_inputs["resolution"] = "720p" if resolution == "720p" else "1080p"
        aspect_ratio = str(mapped_inputs.get("aspect_ratio") or gen_request.resolution or "16:9").strip()
        mapped_inputs["aspect_ratio"] = aspect_ratio if aspect_ratio in STANDARD_VIDEO_ASPECT_RATIOS else "16:9"
        mapped_inputs["camera_fixed"] = _coerce_bool(mapped_inputs.get("camera_fixed"), False)
        mapped_inputs["enable_safety_checker"] = _coerce_bool(mapped_inputs.get("enable_safety_checker"), True)
        seed = _coerce_int(mapped_inputs.get("seed"))
        if seed is None:
            mapped_inputs.pop("seed", None)
        else:
            mapped_inputs["seed"] = seed
        return mapped_inputs

    if mapped_model == BYTEDANCE_V1_LITE_IMAGE_MODEL:
        mapped_inputs["prompt"] = require_prompt()
        image_url = (_unique_urls(mapped_inputs.get("image_url"), mapped_inputs.get("image"), mapped_inputs.get("image_urls"), mapped_inputs.get("input_urls")) or [None])[0]
        if not image_url:
            raise HTTPException(status_code=400, detail="Reference image is required for this model")
        mapped_inputs["image_url"] = image_url
        end_image_url = (_unique_urls(mapped_inputs.get("end_image_url")) or [None])[0]
        if end_image_url:
            mapped_inputs["end_image_url"] = end_image_url
        else:
            mapped_inputs.pop("end_image_url", None)
        mapped_inputs["duration"] = "5"
        mapped_inputs["resolution"] = "720p"
        mapped_inputs["camera_fixed"] = _coerce_bool(mapped_inputs.get("camera_fixed"), False)
        mapped_inputs["enable_safety_checker"] = _coerce_bool(mapped_inputs.get("enable_safety_checker"), True)
        seed = _coerce_int(mapped_inputs.get("seed"))
        if seed is None:
            mapped_inputs.pop("seed", None)
        else:
            mapped_inputs["seed"] = seed
        mapped_inputs.pop("aspect_ratio", None)
        for key in ("image", "image_urls", "input_urls"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model == BYTEDANCE_V1_LITE_TEXT_MODEL:
        mapped_inputs["prompt"] = require_prompt()
        mapped_inputs["duration"] = "5"
        mapped_inputs["resolution"] = "720p"
        aspect_ratio = str(mapped_inputs.get("aspect_ratio") or gen_request.resolution or "16:9").strip()
        mapped_inputs["aspect_ratio"] = aspect_ratio if aspect_ratio in STANDARD_VIDEO_ASPECT_RATIOS else "16:9"
        mapped_inputs["camera_fixed"] = _coerce_bool(mapped_inputs.get("camera_fixed"), False)
        mapped_inputs["enable_safety_checker"] = _coerce_bool(mapped_inputs.get("enable_safety_checker"), True)
        return mapped_inputs

    if mapped_model == WAN_22_TEXT_TURBO_MODEL:
        mapped_inputs["prompt"] = require_prompt()
        aspect_ratio = str(mapped_inputs.get("aspect_ratio") or gen_request.resolution or "16:9").strip()
        mapped_inputs["aspect_ratio"] = aspect_ratio if aspect_ratio in STANDARD_VIDEO_ASPECT_RATIOS else "16:9"
        mapped_inputs["resolution"] = "720p"
        mapped_inputs["enable_prompt_expansion"] = _coerce_bool(mapped_inputs.get("enable_prompt_expansion"), True)
        acceleration = str(mapped_inputs.get("acceleration") or "none").strip().lower()
        mapped_inputs["acceleration"] = acceleration or "none"
        seed = _coerce_int(mapped_inputs.get("seed"), 0)
        mapped_inputs["seed"] = 0 if seed is None else seed
        return mapped_inputs

    if mapped_model == WAN_22_IMAGE_TURBO_MODEL:
        mapped_inputs["prompt"] = require_prompt()
        image_url = (_unique_urls(mapped_inputs.get("image_url"), mapped_inputs.get("image"), mapped_inputs.get("image_urls"), mapped_inputs.get("input_urls")) or [None])[0]
        if not image_url:
            raise HTTPException(status_code=400, detail="Reference image is required for this model")
        mapped_inputs["image_url"] = image_url
        mapped_inputs["resolution"] = "720p"
        mapped_inputs["enable_prompt_expansion"] = _coerce_bool(mapped_inputs.get("enable_prompt_expansion"), True)
        acceleration = str(mapped_inputs.get("acceleration") or "none").strip().lower()
        mapped_inputs["acceleration"] = acceleration or "none"
        seed = _coerce_int(mapped_inputs.get("seed"), 0)
        mapped_inputs["seed"] = 0 if seed is None else seed
        mapped_inputs.pop("aspect_ratio", None)
        for key in ("image", "image_urls", "input_urls"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model == WAN_26_IMAGE_MODEL:
        mapped_inputs["prompt"] = require_prompt()
        image_urls = _unique_urls(mapped_inputs.get("image_urls"), mapped_inputs.get("image_url"), mapped_inputs.get("image"), mapped_inputs.get("input_urls"))
        if not image_urls:
            raise HTTPException(status_code=400, detail="Reference image is required for this model")
        mapped_inputs["image_urls"] = image_urls[:1]
        mapped_inputs["duration"] = "5"
        resolution = str(mapped_inputs.get("resolution") or gen_request.resolution or "720p").strip().lower()
        mapped_inputs["resolution"] = "1080p" if resolution == "1080p" else "720p"
        mapped_inputs.pop("aspect_ratio", None)
        for key in ("image", "image_url", "input_urls"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model == WAN_26_FLASH_IMAGE_MODEL:
        mapped_inputs["prompt"] = require_prompt()
        image_urls = _unique_urls(mapped_inputs.get("image_urls"), mapped_inputs.get("image_url"), mapped_inputs.get("image"), mapped_inputs.get("input_urls"))
        if not image_urls:
            raise HTTPException(status_code=400, detail="Reference image is required for this model")
        mapped_inputs["image_urls"] = image_urls[:2]
        mapped_inputs["duration"] = "5"
        resolution = str(mapped_inputs.get("resolution") or gen_request.resolution or "720p").strip().lower()
        mapped_inputs["resolution"] = "1080p" if resolution == "1080p" else "720p"
        mapped_inputs["multi_shots"] = _coerce_bool(mapped_inputs.get("multi_shots"), False)
        mapped_inputs.pop("aspect_ratio", None)
        mapped_inputs.pop("audio", None)
        for key in ("image", "image_url", "input_urls"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model in {WAN_26_TEXT_MODEL}:
        mapped_inputs["prompt"] = require_prompt()
        mapped_inputs["duration"] = "5"
        resolution = str(mapped_inputs.get("resolution") or gen_request.resolution or "720p").strip().lower()
        mapped_inputs["resolution"] = "1080p" if resolution == "1080p" else "720p"
        mapped_inputs.pop("aspect_ratio", None)
        mapped_inputs.pop("audio", None)
        return mapped_inputs

    if mapped_model == WAN_26_VIDEO_MODEL:
        mapped_inputs["prompt"] = require_prompt()
        video_urls = _unique_urls(mapped_inputs.get("video_urls"), mapped_inputs.get("video_url"), mapped_inputs.get("video"))
        if not video_urls:
            raise HTTPException(status_code=400, detail="Reference video is required for this model")
        mapped_inputs["video_urls"] = video_urls[:1]
        mapped_inputs["duration"] = "5"
        resolution = str(mapped_inputs.get("resolution") or gen_request.resolution or "720p").strip().lower()
        mapped_inputs["resolution"] = "1080p" if resolution == "1080p" else "720p"
        mapped_inputs.pop("audio", None)
        for key in ("video", "video_url"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model == WAN_26_FLASH_VIDEO_MODEL:
        mapped_inputs["prompt"] = require_prompt()
        video_urls = _unique_urls(mapped_inputs.get("video_urls"), mapped_inputs.get("video_url"), mapped_inputs.get("video"))
        if not video_urls:
            raise HTTPException(status_code=400, detail="Reference video is required for this model")
        mapped_inputs["video_urls"] = video_urls[:1]
        mapped_inputs["duration"] = "5"
        resolution = str(mapped_inputs.get("resolution") or gen_request.resolution or "720p").strip().lower()
        mapped_inputs["resolution"] = "1080p" if resolution == "1080p" else "720p"
        mapped_inputs["multi_shots"] = _coerce_bool(mapped_inputs.get("multi_shots"), False)
        mapped_inputs.pop("audio", None)
        for key in ("video", "video_url"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model == WAN_22_SPEECH_TURBO_MODEL:
        mapped_inputs["prompt"] = require_prompt()
        image_url = (_unique_urls(mapped_inputs.get("image_url"), mapped_inputs.get("image"), mapped_inputs.get("image_urls")) or [None])[0]
        audio_url = (_unique_urls(mapped_inputs.get("audio_url"), mapped_inputs.get("audio")) or [None])[0]
        if not image_url or not audio_url:
            raise HTTPException(status_code=400, detail="Image and audio are required for speech-to-video")
        mapped_inputs["image_url"] = image_url
        mapped_inputs["audio_url"] = audio_url
        mapped_inputs["resolution"] = "480p"
        negative_prompt = str(mapped_inputs.get("negative_prompt") or "").strip()
        if negative_prompt:
            mapped_inputs["negative_prompt"] = negative_prompt
        else:
            mapped_inputs.pop("negative_prompt", None)
        mapped_inputs["enable_safety_checker"] = _coerce_bool(mapped_inputs.get("enable_safety_checker"), True)
        for numeric_key, default_value in {
            "num_frames": "80",
            "frames_per_second": "16",
            "guidance_scale": "3.5",
            "num_inference_steps": "27",
            "shift": "5",
        }.items():
            value = str(mapped_inputs.get(numeric_key) or default_value).strip()
            mapped_inputs[numeric_key] = value
        for key in ("image", "image_urls", "audio"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model == WAN_22_ANIMATE_MOVE_MODEL:
        image_url = (_unique_urls(mapped_inputs.get("image_url"), mapped_inputs.get("image"), mapped_inputs.get("image_urls")) or [None])[0]
        video_url = (_unique_urls(mapped_inputs.get("video_url"), mapped_inputs.get("video"), mapped_inputs.get("video_urls")) or [None])[0]
        if not image_url:
            raise HTTPException(status_code=400, detail="Source image is required for animate-move")
        if not video_url:
            raise HTTPException(status_code=400, detail="Source video is required for animate-move")
        mapped_inputs["image_url"] = image_url
        mapped_inputs["video_url"] = video_url
        prompt_value = str(mapped_inputs.get("prompt") or "").strip()
        if prompt_value:
            mapped_inputs["prompt"] = prompt_value
        else:
            mapped_inputs.pop("prompt", None)
        mapped_inputs["resolution"] = "480p"
        for key in ("image", "image_urls", "video", "video_urls"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model == WAN_22_ANIMATE_REPLACE_MODEL:
        image_url = (_unique_urls(mapped_inputs.get("image_url"), mapped_inputs.get("image"), mapped_inputs.get("image_urls")) or [None])[0]
        video_url = (_unique_urls(mapped_inputs.get("video_url"), mapped_inputs.get("video"), mapped_inputs.get("video_urls")) or [None])[0]
        if not image_url or not video_url:
            raise HTTPException(status_code=400, detail="Replacement image and source video are required for animate-replace")
        mapped_inputs["image_url"] = image_url
        mapped_inputs["video_url"] = video_url
        prompt_value = str(mapped_inputs.get("prompt") or "").strip()
        if prompt_value:
            mapped_inputs["prompt"] = prompt_value
        else:
            mapped_inputs.pop("prompt", None)
        mapped_inputs["resolution"] = "480p"
        for key in ("image", "image_urls", "video", "video_urls", "reference_image_url"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model == RUNWAY_GENERATE_MODEL:
        mapped_inputs["prompt"] = require_prompt()
        image_url = (_unique_urls(mapped_inputs.get("image_url"), mapped_inputs.get("image"), mapped_inputs.get("image_urls")) or [None])[0]
        if image_url:
            mapped_inputs["image_url"] = image_url
        else:
            mapped_inputs.pop("image_url", None)
        aspect_ratio = str(mapped_inputs.get("aspect_ratio") or gen_request.resolution or "16:9").strip()
        if aspect_ratio in RUNWAY_ASPECT_RATIOS:
            mapped_inputs["aspect_ratio"] = aspect_ratio
        else:
            mapped_inputs["aspect_ratio"] = "16:9"
        duration = str(_coerce_int(mapped_inputs.get("duration"), gen_request.duration or 5) or 5)
        mapped_inputs["duration"] = duration if duration in {"5", "10"} else "5"
        resolution = str(mapped_inputs.get("resolution") or gen_request.resolution or "720p").strip().lower()
        if resolution == "1080p" and mapped_inputs["duration"] == "10":
            raise HTTPException(status_code=400, detail="Runway Generate supports 1080p only for 5s clips")
        mapped_inputs["resolution"] = "1080p" if resolution == "1080p" else "720p"
        watermark_text = str(mapped_inputs.get("watermark_text") or "").strip()
        if watermark_text:
            mapped_inputs["watermark_text"] = watermark_text
        else:
            mapped_inputs.pop("watermark_text", None)
        for key in ("image", "image_urls"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model == RUNWAY_EXTEND_MODEL:
        mapped_inputs["prompt"] = require_prompt()
        origin_task_id = str(mapped_inputs.get("origin_task_id") or mapped_inputs.get("task_id") or "").strip()
        if not origin_task_id:
            raise HTTPException(status_code=400, detail="Source task ID is required for Runway Extend")
        mapped_inputs["origin_task_id"] = origin_task_id
        image_url = (_unique_urls(mapped_inputs.get("image_url"), mapped_inputs.get("image"), mapped_inputs.get("image_urls")) or [None])[0]
        if image_url:
            mapped_inputs["image_url"] = image_url
        else:
            mapped_inputs.pop("image_url", None)
        resolution = str(mapped_inputs.get("resolution") or gen_request.resolution or "720p").strip().lower()
        mapped_inputs["resolution"] = "1080p" if resolution == "1080p" else "720p"
        mapped_inputs["enable_prompt_expansion"] = _coerce_bool(mapped_inputs.get("enable_prompt_expansion"), False)
        watermark_text = str(mapped_inputs.get("watermark_text") or "").strip()
        if watermark_text:
            mapped_inputs["watermark_text"] = watermark_text
        else:
            mapped_inputs.pop("watermark_text", None)
        for key in ("image", "image_urls", "task_id"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model == RUNWAY_ALEPH_GENERATE_MODEL:
        mapped_inputs["prompt"] = require_prompt()
        video_url = (_unique_urls(mapped_inputs.get("video_url"), mapped_inputs.get("video"), mapped_inputs.get("video_urls")) or [None])[0]
        if not video_url:
            raise HTTPException(status_code=400, detail="Source video is required for Runway Aleph")
        mapped_inputs["video_url"] = video_url
        reference_image = (_unique_urls(
            mapped_inputs.get("reference_image"),
            mapped_inputs.get("reference_image_url"),
            mapped_inputs.get("image_url"),
            mapped_inputs.get("image"),
            mapped_inputs.get("image_urls"),
        ) or [None])[0]
        if reference_image:
            mapped_inputs["reference_image"] = reference_image
        else:
            mapped_inputs.pop("reference_image", None)
        seed = _coerce_int(mapped_inputs.get("seed"))
        if seed is None:
            mapped_inputs.pop("seed", None)
        else:
            mapped_inputs["seed"] = seed
        aspect_ratio = str(mapped_inputs.get("aspect_ratio") or "").strip()
        if aspect_ratio in {"1:1", "4:3", "3:4", "9:16", "16:9", "21:9"}:
            mapped_inputs["aspect_ratio"] = aspect_ratio
        else:
            mapped_inputs.pop("aspect_ratio", None)
        watermark_text = str(mapped_inputs.get("watermark_text") or "").strip()
        if watermark_text:
            mapped_inputs["watermark_text"] = watermark_text
        else:
            mapped_inputs.pop("watermark_text", None)
        for key in ("image", "image_urls", "image_url", "reference_image_url", "video", "video_urls", "enable_prompt_expansion"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model == KLING_26_TEXT_MODEL:
        mapped_inputs["prompt"] = require_prompt()
        mapped_inputs["sound"] = _coerce_bool(mapped_inputs.get("sound"), False)
        duration = str(_coerce_int(mapped_inputs.get("duration"), gen_request.duration or 5) or 5)
        mapped_inputs["duration"] = duration if duration in {"5", "10"} else "5"
        aspect_ratio = str(mapped_inputs.get("aspect_ratio") or gen_request.resolution or "1:1").strip()
        mapped_inputs["aspect_ratio"] = aspect_ratio if aspect_ratio in STANDARD_VIDEO_ASPECT_RATIOS else "1:1"
        mapped_inputs.pop("resolution", None)
        return mapped_inputs

    if mapped_model == KLING_26_IMAGE_MODEL:
        mapped_inputs["prompt"] = require_prompt()
        image_urls = _unique_urls(mapped_inputs.get("image_urls"), mapped_inputs.get("image"), mapped_inputs.get("image_url"), mapped_inputs.get("input_urls"))
        if not image_urls:
            raise HTTPException(status_code=400, detail="Reference image is required for this model")
        mapped_inputs["image_urls"] = image_urls[:1]
        mapped_inputs["sound"] = _coerce_bool(mapped_inputs.get("sound"), False)
        duration = str(_coerce_int(mapped_inputs.get("duration"), gen_request.duration or 5) or 5)
        mapped_inputs["duration"] = duration if duration in {"5", "10"} else "5"
        mapped_inputs.pop("resolution", None)
        mapped_inputs.pop("aspect_ratio", None)
        for key in ("image", "image_url", "input_urls"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model == KLING_V21_MASTER_IMAGE_MODEL:
        mapped_inputs["prompt"] = require_prompt()
        image_url = (_unique_urls(mapped_inputs.get("image_url"), mapped_inputs.get("image"), mapped_inputs.get("image_urls"), mapped_inputs.get("input_urls")) or [None])[0]
        if not image_url:
            raise HTTPException(status_code=400, detail="Reference image is required for this model")
        mapped_inputs["image_url"] = image_url
        duration = str(_coerce_int(mapped_inputs.get("duration"), gen_request.duration or 5) or 5)
        mapped_inputs["duration"] = duration if duration in {"5", "10"} else "5"
        negative_prompt = str(mapped_inputs.get("negative_prompt") or "").strip()
        if negative_prompt:
            mapped_inputs["negative_prompt"] = negative_prompt
        else:
            mapped_inputs.pop("negative_prompt", None)
        cfg_scale = _coerce_float(mapped_inputs.get("cfg_scale"), 0.5)
        mapped_inputs["cfg_scale"] = min(max(cfg_scale or 0.5, 0.0), 1.0)
        mapped_inputs.pop("resolution", None)
        mapped_inputs.pop("aspect_ratio", None)
        for key in ("image", "image_urls", "input_urls"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model == KLING_V25_TURBO_TEXT_MODEL:
        mapped_inputs["prompt"] = require_prompt()
        duration = str(_coerce_int(mapped_inputs.get("duration"), gen_request.duration or 5) or 5)
        mapped_inputs["duration"] = duration if duration in {"5", "10"} else "5"
        aspect_ratio = str(mapped_inputs.get("aspect_ratio") or gen_request.resolution or "16:9").strip()
        mapped_inputs["aspect_ratio"] = aspect_ratio if aspect_ratio in STANDARD_VIDEO_ASPECT_RATIOS else "16:9"
        negative_prompt = str(mapped_inputs.get("negative_prompt") or "").strip()
        if negative_prompt:
            mapped_inputs["negative_prompt"] = negative_prompt
        else:
            mapped_inputs.pop("negative_prompt", None)
        cfg_scale = _coerce_float(mapped_inputs.get("cfg_scale"), 0.5)
        mapped_inputs["cfg_scale"] = min(max(cfg_scale or 0.5, 0.0), 1.0)
        mapped_inputs.pop("resolution", None)
        return mapped_inputs

    if mapped_model in KLING_AI_AVATAR_MODELS:
        image_url = (_unique_urls(mapped_inputs.get("image_url"), mapped_inputs.get("image"), mapped_inputs.get("image_urls")) or [None])[0]
        audio_url = (_unique_urls(mapped_inputs.get("audio_url"), mapped_inputs.get("audio")) or [None])[0]
        if not image_url:
            raise HTTPException(status_code=400, detail="Avatar image is required for this model")
        if not audio_url:
            raise HTTPException(status_code=400, detail="Audio file is required for this model")
        mapped_inputs["image_url"] = image_url
        mapped_inputs["audio_url"] = audio_url
        mapped_inputs["prompt"] = str(mapped_inputs.get("prompt") or "")
        mapped_inputs.pop("resolution", None)
        mapped_inputs.pop("aspect_ratio", None)
        mapped_inputs.pop("duration", None)
        for key in ("image", "image_urls", "audio"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model == KLING_3_MOTION_MODEL:
        input_urls = _unique_urls(mapped_inputs.get("input_urls"), mapped_inputs.get("image_urls"), mapped_inputs.get("image"), mapped_inputs.get("image_url"))
        video_urls = _unique_urls(mapped_inputs.get("video_urls"), mapped_inputs.get("video"), mapped_inputs.get("video_url"))
        if not input_urls:
            raise HTTPException(status_code=400, detail="Reference image is required for motion control")
        if not video_urls:
            raise HTTPException(status_code=400, detail="Reference video is required for motion control")
        mapped_inputs["input_urls"] = input_urls[:1]
        mapped_inputs["video_urls"] = video_urls[:1]
        prompt_value = str(mapped_inputs.get("prompt") or "").strip()
        if prompt_value:
            mapped_inputs["prompt"] = prompt_value
        else:
            mapped_inputs.pop("prompt", None)
        mode = str(mapped_inputs.get("mode") or mapped_inputs.get("resolution") or gen_request.resolution or "720p").strip().lower()
        mapped_inputs["mode"] = "1080p" if mode in {"1080p", "4k", "pro"} else "720p"
        mapped_inputs["character_orientation"] = "video" if str(mapped_inputs.get("character_orientation") or "").strip() == "video" else "image"
        mapped_inputs["background_source"] = "input_image" if str(mapped_inputs.get("background_source") or "").strip() == "input_image" else "input_video"
        mapped_inputs.pop("resolution", None)
        mapped_inputs.pop("aspect_ratio", None)
        mapped_inputs.pop("duration", None)
        for key in ("image", "image_url", "image_urls", "video", "video_url"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model == KLING_30_VIDEO_MODEL:
        multi_shots = _coerce_bool(mapped_inputs.get("multi_shots"), False)
        mapped_inputs["multi_shots"] = multi_shots
        if multi_shots:
            multi_prompt = mapped_inputs.get("multi_prompt")
            if not isinstance(multi_prompt, list) or not multi_prompt:
                raise HTTPException(status_code=400, detail="At least one shot is required in multi-shot mode")
            normalized_multi_prompt = []
            for item in multi_prompt[:5]:
                if not isinstance(item, dict):
                    continue
                shot_prompt = str(item.get("prompt") or "").strip()
                shot_duration = _coerce_int(item.get("duration"))
                if not shot_prompt or shot_duration is None:
                    continue
                normalized_multi_prompt.append({
                    "prompt": shot_prompt,
                    "duration": min(max(shot_duration, 1), 12),
                })
            if not normalized_multi_prompt:
                raise HTTPException(status_code=400, detail="Valid multi-shot prompts are required")
            mapped_inputs["multi_prompt"] = normalized_multi_prompt
            mapped_inputs["sound"] = _coerce_bool(mapped_inputs.get("sound"), True)
            mapped_inputs.pop("prompt", None)
        else:
            mapped_inputs["prompt"] = require_prompt()
            mapped_inputs.pop("multi_prompt", None)
            mapped_inputs["sound"] = _coerce_bool(mapped_inputs.get("sound"), False)

        image_urls = _unique_urls(mapped_inputs.get("image_urls"), mapped_inputs.get("image"), mapped_inputs.get("image_url"), mapped_inputs.get("input_urls"))
        if image_urls:
            mapped_inputs["image_urls"] = image_urls[: (1 if multi_shots else 2)]
        else:
            mapped_inputs.pop("image_urls", None)
        duration = str(_coerce_int(mapped_inputs.get("duration"), gen_request.duration or 5) or 5)
        mapped_inputs["duration"] = duration if duration in {str(i) for i in range(3, 16)} else "5"
        aspect_ratio = str(mapped_inputs.get("aspect_ratio") or gen_request.resolution or "16:9").strip()
        if image_urls and aspect_ratio not in STANDARD_VIDEO_ASPECT_RATIOS:
            mapped_inputs.pop("aspect_ratio", None)
        else:
            mapped_inputs["aspect_ratio"] = aspect_ratio if aspect_ratio in STANDARD_VIDEO_ASPECT_RATIOS else "16:9"
        mode = str(mapped_inputs.get("mode") or "pro").strip().lower()
        mapped_inputs["mode"] = mode if mode in {"std", "pro"} else "pro"
        kling_elements = mapped_inputs.get("kling_elements")
        if isinstance(kling_elements, list):
            normalized_elements = []
            for item in kling_elements[:10]:
                if not isinstance(item, dict):
                    continue
                name = str(item.get("name") or "").strip()
                description = str(item.get("description") or "").strip()
                element_urls = _coerce_str_list(item.get("element_input_urls"))
                element_video_urls = _coerce_str_list(item.get("element_input_video_urls"))
                if name and description and (element_urls or element_video_urls):
                    normalized_item = {
                        "name": name,
                        "description": description,
                    }
                    if element_urls:
                        normalized_item["element_input_urls"] = element_urls[:2]
                    if element_video_urls:
                        normalized_item["element_input_video_urls"] = element_video_urls[:2]
                    normalized_elements.append(normalized_item)
            if normalized_elements:
                mapped_inputs["kling_elements"] = normalized_elements
            else:
                mapped_inputs.pop("kling_elements", None)
        else:
            mapped_inputs.pop("kling_elements", None)
        mapped_inputs.pop("resolution", None)
        for key in ("image", "image_url", "input_urls"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model in {VEO_31_TEXT_FAST_MODEL, VEO_31_TEXT_QUALITY_MODEL}:
        mapped_inputs["prompt"] = require_prompt()
        aspect_ratio = str(mapped_inputs.get("aspect_ratio") or gen_request.resolution or "16:9").strip()
        mapped_inputs["aspect_ratio"] = aspect_ratio if aspect_ratio in VEO_ASPECT_RATIOS else "16:9"
        duration = str(_coerce_int(mapped_inputs.get("duration"), gen_request.duration or 5) or 5)
        mapped_inputs["duration"] = duration if duration in VEO_DURATIONS else "5"
        mapped_inputs["generation_type"] = "TEXT_2_VIDEO"
        mapped_inputs["enable_fallback"] = _coerce_bool(mapped_inputs.get("enable_fallback"), False)
        mapped_inputs.pop("resolution", None)
        for key in ("image", "image_url", "image_urls", "input_urls"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model in {VEO_31_IMAGE_FAST_MODEL, VEO_31_IMAGE_QUALITY_MODEL}:
        mapped_inputs["prompt"] = require_prompt()
        aspect_ratio = str(mapped_inputs.get("aspect_ratio") or gen_request.resolution or "16:9").strip()
        mapped_inputs["aspect_ratio"] = aspect_ratio if aspect_ratio in VEO_ASPECT_RATIOS else "16:9"
        duration = str(_coerce_int(mapped_inputs.get("duration"), gen_request.duration or 5) or 5)
        mapped_inputs["duration"] = duration if duration in VEO_DURATIONS else "5"
        image_urls = _unique_urls(
            mapped_inputs.get("image_urls"),
            mapped_inputs.get("image_url"),
            mapped_inputs.get("image"),
            mapped_inputs.get("input_urls"),
        )
        if not image_urls:
            raise HTTPException(status_code=400, detail="Reference image is required for VEO image mode")
        mapped_inputs["image_urls"] = image_urls[:2]
        mapped_inputs["generation_type"] = "FIRST_AND_LAST_FRAMES_2_VIDEO"
        mapped_inputs["enable_fallback"] = _coerce_bool(mapped_inputs.get("enable_fallback"), False)
        mapped_inputs.pop("resolution", None)
        for key in ("image", "image_url", "input_urls"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model == VEO_31_REFERENCE_FAST_MODEL:
        mapped_inputs["prompt"] = require_prompt()
        image_urls = _unique_urls(
            mapped_inputs.get("image_urls"),
            mapped_inputs.get("image_url"),
            mapped_inputs.get("image"),
            mapped_inputs.get("input_urls"),
        )
        if not image_urls:
            raise HTTPException(status_code=400, detail="Reference image is required for VEO reference mode")
        mapped_inputs["image_urls"] = image_urls[:3]
        mapped_inputs["aspect_ratio"] = "16:9"
        mapped_inputs["duration"] = "8"
        mapped_inputs["generation_type"] = "REFERENCE_2_VIDEO"
        mapped_inputs["enable_fallback"] = _coerce_bool(mapped_inputs.get("enable_fallback"), False)
        mapped_inputs.pop("resolution", None)
        for key in ("image", "image_url", "input_urls"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model in {VEO_31_EXTEND_FAST_MODEL, VEO_31_EXTEND_QUALITY_MODEL}:
        mapped_inputs["prompt"] = require_prompt()
        origin_task_id = str(mapped_inputs.get("origin_task_id") or "").strip()
        if not origin_task_id:
            raise HTTPException(status_code=400, detail="Source video ID is required for VEO Extend")
        mapped_inputs["origin_task_id"] = origin_task_id
        mapped_inputs["generation_mode"] = "fast" if mapped_model == VEO_31_EXTEND_FAST_MODEL else "quality"
        mapped_inputs["enable_fallback"] = _coerce_bool(mapped_inputs.get("enable_fallback"), False)
        mapped_inputs.pop("resolution", None)
        mapped_inputs.pop("aspect_ratio", None)
        mapped_inputs.pop("duration", None)
        for key in ("video", "video_url", "video_urls"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model in {SORA_2_TEXT_MODEL, SORA_2_PRO_TEXT_MODEL}:
        mapped_inputs["prompt"] = require_prompt()
        aspect_ratio = str(mapped_inputs.get("aspect_ratio") or "landscape").strip().lower()
        mapped_inputs["aspect_ratio"] = aspect_ratio if aspect_ratio in SORA_ASPECT_RATIOS else "landscape"
        n_frames = str(_coerce_int(mapped_inputs.get("n_frames"), 10) or 10)
        mapped_inputs["n_frames"] = n_frames if n_frames in SORA_FRAME_COUNTS else "10"
        mapped_inputs["remove_watermark"] = _coerce_bool(mapped_inputs.get("remove_watermark"), False)
        character_ids = _unique_urls(mapped_inputs.get("character_id_list"))
        if character_ids:
            mapped_inputs["character_id_list"] = character_ids[:5]
        else:
            mapped_inputs.pop("character_id_list", None)
        if mapped_model == SORA_2_PRO_TEXT_MODEL:
            size = str(mapped_inputs.get("size") or "high").strip().lower()
            mapped_inputs["size"] = size if size in {"standard", "high"} else "high"
        else:
            mapped_inputs.pop("size", None)
        mapped_inputs.pop("resolution", None)
        mapped_inputs.pop("duration", None)
        return mapped_inputs

    if mapped_model in {SORA_2_IMAGE_MODEL, SORA_2_PRO_IMAGE_MODEL}:
        mapped_inputs["prompt"] = require_prompt()
        image_urls = _unique_urls(mapped_inputs.get("image_urls"), mapped_inputs.get("image"), mapped_inputs.get("image_url"), mapped_inputs.get("input_urls"))
        if not image_urls:
            raise HTTPException(status_code=400, detail="Reference image is required for this model")
        mapped_inputs["image_urls"] = image_urls[:1]
        aspect_ratio = str(mapped_inputs.get("aspect_ratio") or "landscape").strip().lower()
        mapped_inputs["aspect_ratio"] = aspect_ratio if aspect_ratio in SORA_ASPECT_RATIOS else "landscape"
        n_frames = str(_coerce_int(mapped_inputs.get("n_frames"), 10) or 10)
        mapped_inputs["n_frames"] = n_frames if n_frames in SORA_FRAME_COUNTS else "10"
        mapped_inputs["remove_watermark"] = _coerce_bool(mapped_inputs.get("remove_watermark"), False)
        character_ids = _unique_urls(mapped_inputs.get("character_id_list"))
        if character_ids:
            mapped_inputs["character_id_list"] = character_ids[:5]
        else:
            mapped_inputs.pop("character_id_list", None)
        if mapped_model == SORA_2_PRO_IMAGE_MODEL:
            size = str(mapped_inputs.get("size") or "standard").strip().lower()
            mapped_inputs["size"] = size if size in {"standard", "high"} else "standard"
        else:
            mapped_inputs.pop("size", None)
        mapped_inputs.pop("resolution", None)
        mapped_inputs.pop("duration", None)
        for key in ("image", "image_url", "input_urls"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model == SORA_2_PRO_STORYBOARD_MODEL:
        shots = mapped_inputs.get("shots")
        if not isinstance(shots, list) or not shots:
            raise HTTPException(status_code=400, detail="Storyboard shots are required")
        normalized_shots = []
        for shot in shots[:10]:
            if not isinstance(shot, dict):
                continue
            scene = str(shot.get("Scene") or shot.get("scene") or "").strip()
            duration = _coerce_float(shot.get("duration"))
            if not scene or duration is None:
                continue
            normalized_shots.append({"Scene": scene, "duration": min(max(duration, 0.1), 15.0)})
        if not normalized_shots:
            raise HTTPException(status_code=400, detail="Storyboard shots are invalid")
        image_urls = _unique_urls(mapped_inputs.get("image_urls"), mapped_inputs.get("image"), mapped_inputs.get("image_url"), mapped_inputs.get("input_urls"))
        if not image_urls:
            raise HTTPException(status_code=400, detail="Reference image is required for storyboard generation")
        n_frames = str(_coerce_int(mapped_inputs.get("n_frames"), 15) or 15)
        mapped_inputs["shots"] = normalized_shots
        mapped_inputs["image_urls"] = image_urls[:1]
        mapped_inputs["n_frames"] = n_frames if n_frames in SORA_STORYBOARD_FRAME_COUNTS else "15"
        aspect_ratio = str(mapped_inputs.get("aspect_ratio") or "landscape").strip().lower()
        mapped_inputs["aspect_ratio"] = aspect_ratio if aspect_ratio in SORA_ASPECT_RATIOS else "landscape"
        mapped_inputs.pop("resolution", None)
        mapped_inputs.pop("duration", None)
        for key in ("image", "image_url", "input_urls"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model == SORA_WATERMARK_REMOVER_MODEL:
        video_url = str(mapped_inputs.get("video_url") or mapped_inputs.get("video") or "").strip()
        if not video_url:
            raise HTTPException(status_code=400, detail="Sora video URL is required")
        mapped_inputs["video_url"] = video_url
        mapped_inputs.pop("prompt", None)
        mapped_inputs.pop("resolution", None)
        mapped_inputs.pop("aspect_ratio", None)
        mapped_inputs.pop("duration", None)
        mapped_inputs.pop("video", None)
        return mapped_inputs

    if mapped_model == SORA_2_CHARACTERS_MODEL:
        character_file_url = _unique_urls(mapped_inputs.get("character_file_url"), mapped_inputs.get("video_urls"), mapped_inputs.get("video"), mapped_inputs.get("video_url"))
        if not character_file_url:
            raise HTTPException(status_code=400, detail="Character reference video is required")
        mapped_inputs["character_file_url"] = character_file_url[:1]
        character_prompt = str(mapped_inputs.get("character_prompt") or "").strip()
        if character_prompt:
            mapped_inputs["character_prompt"] = character_prompt
        else:
            mapped_inputs.pop("character_prompt", None)
        safety_instruction = str(mapped_inputs.get("safety_instruction") or "").strip()
        if safety_instruction:
            mapped_inputs["safety_instruction"] = safety_instruction
        else:
            mapped_inputs.pop("safety_instruction", None)
        mapped_inputs.pop("prompt", None)
        mapped_inputs.pop("resolution", None)
        mapped_inputs.pop("aspect_ratio", None)
        mapped_inputs.pop("duration", None)
        for key in ("video", "video_url", "video_urls"):
            mapped_inputs.pop(key, None)
        return mapped_inputs

    if mapped_model == SORA_2_CHARACTERS_PRO_MODEL:
        origin_task_id = str(mapped_inputs.get("origin_task_id") or "").strip()
        timestamps = str(mapped_inputs.get("timestamps") or "").strip()
        character_prompt = str(mapped_inputs.get("character_prompt") or "").strip()
        if not origin_task_id or not timestamps or not character_prompt:
            raise HTTPException(status_code=400, detail="origin_task_id, timestamps and character_prompt are required")
        parsed_range = _parse_timestamp_range(timestamps)
        if parsed_range is None:
            raise HTTPException(status_code=400, detail="timestamps must use the format start,end with ascending numbers")
        start, end = parsed_range
        if end - start < 1 or end - start > 4:
            raise HTTPException(status_code=400, detail="Sora Characters Pro supports only 1-4 second timestamp ranges")
        mapped_inputs["origin_task_id"] = origin_task_id
        mapped_inputs["timestamps"] = timestamps
        mapped_inputs["character_prompt"] = character_prompt
        character_user_name = str(mapped_inputs.get("character_user_name") or "").strip()
        if character_user_name:
            mapped_inputs["character_user_name"] = character_user_name[:40]
        else:
            mapped_inputs.pop("character_user_name", None)
        safety_instruction = str(mapped_inputs.get("safety_instruction") or "").strip()
        if safety_instruction:
            mapped_inputs["safety_instruction"] = safety_instruction
        else:
            mapped_inputs.pop("safety_instruction", None)
        mapped_inputs.pop("prompt", None)
        mapped_inputs.pop("resolution", None)
        mapped_inputs.pop("aspect_ratio", None)
        mapped_inputs.pop("duration", None)
        return mapped_inputs

    return mapped_inputs


def _normalize_pricing_value(value: Any) -> Any:
    if isinstance(value, str):
        normalized = value.strip()
        return normalized.lower() if normalized else None
    return value


def _extract_pricing_context(
    category: str,
    mapped_model: str,
    mapped_inputs: dict[str, Any],
    gen_request: GenerateRequest,
) -> dict[str, Any]:
    if category == "video":
        aspect_ratio = str(mapped_inputs.get("aspect_ratio") or "").strip() or None
        reference_sources = _collect_reference_sources(mapped_inputs)
        generation_mode = str(
            mapped_inputs.get("generation_mode")
            or mapped_inputs.get("mode")
            or mapped_inputs.get("size")
            or (
                "multi-shot"
                if _coerce_bool(mapped_inputs.get("multi_shots"), False)
                else ("single-shot" if "multi_shots" in mapped_inputs else "")
            )
        ).strip() or None
        frame_count = _coerce_int(mapped_inputs.get("frame_count"))
        if frame_count is None:
            frame_count = _coerce_int(mapped_inputs.get("n_frames"))
        return {
            "resolution": str(mapped_inputs.get("resolution") or gen_request.resolution or "").strip() or None,
            "duration": _coerce_int(mapped_inputs.get("duration"), gen_request.duration),
            "aspect_ratio": aspect_ratio,
            "output_format": None,
            "num_images": None,
            "google_search": None,
            "reference_count": len(reference_sources) or None,
            "generation_mode": generation_mode,
            "acceleration": str(mapped_inputs.get("acceleration") or "").strip() or None,
            "frame_count": frame_count,
            "sound_enabled": mapped_inputs.get("sound") if isinstance(mapped_inputs.get("sound"), bool) else None,
            "remove_watermark": mapped_inputs.get("remove_watermark") if isinstance(mapped_inputs.get("remove_watermark"), bool) else None,
        }

    if category == "image":
        reference_sources = (
            _coerce_str_list(mapped_inputs.get("image_input"))
            + _coerce_str_list(mapped_inputs.get("image_urls"))
            + _coerce_str_list(mapped_inputs.get("input_urls"))
            + _coerce_str_list(mapped_inputs.get("reference_image_urls"))
            + _coerce_str_list(mapped_inputs.get("image_url"))
            + _coerce_str_list(mapped_inputs.get("image"))
        )
        unique_references = len(dict.fromkeys(reference_sources))
        aspect_ratio = (
            str(mapped_inputs.get("aspect_ratio") or "").strip()
            or str(mapped_inputs.get("image_size") or "").strip()
            or (str(gen_request.resolution).strip() if isinstance(gen_request.resolution, str) and ":" in gen_request.resolution else "")
        )
        resolution = str(mapped_inputs.get("resolution") or gen_request.resolution or "").strip() or None
        output_format = str(mapped_inputs.get("output_format") or "").strip().lower() or None
        num_images = mapped_inputs.get("num_images")
        if isinstance(num_images, str) and num_images.isdigit():
            num_images = int(num_images)
        return {
            "resolution": resolution,
            "duration": None,
            "aspect_ratio": aspect_ratio or None,
            "output_format": output_format,
            "num_images": num_images if isinstance(num_images, int) else None,
            "google_search": mapped_inputs.get("google_search") if isinstance(mapped_inputs.get("google_search"), bool) else None,
            "reference_count": unique_references or None,
            "generation_mode": None,
            "acceleration": None,
            "frame_count": None,
            "sound_enabled": None,
            "remove_watermark": None,
        }

    return {
        "resolution": str(gen_request.resolution or "").strip() or None,
        "duration": gen_request.duration,
        "aspect_ratio": None,
        "output_format": None,
        "num_images": None,
        "google_search": None,
        "reference_count": None,
        "generation_mode": None,
        "acceleration": None,
        "frame_count": None,
        "sound_enabled": None,
        "remove_watermark": None,
    }


def _select_best_pricing(
    db: Session,
    category: str,
    mapped_model: str,
    pricing_context: dict[str, Any],
) -> ModelPricing | None:
    candidates = (
        db.query(ModelPricing)
        .filter(
            ModelPricing.model_name == mapped_model,
            ModelPricing.is_active == True,
            ModelPricing.category == category,
        )
        .all()
    )
    if not candidates:
        candidates = (
            db.query(ModelPricing)
            .filter(
                ModelPricing.model_name == mapped_model,
                ModelPricing.is_active == True,
            )
            .all()
        )

    dimensions = (
        "resolution",
        "duration",
        "aspect_ratio",
        "output_format",
        "num_images",
        "google_search",
        "reference_count",
        "generation_mode",
        "acceleration",
        "frame_count",
        "sound_enabled",
        "remove_watermark",
    )
    best_match: ModelPricing | None = None
    best_score = -1

    for candidate in candidates:
        score = 0
        matched = True
        for field in dimensions:
            candidate_value = getattr(candidate, field, None)
            request_value = pricing_context.get(field)

            if candidate_value is None:
                continue

            normalized_candidate = _normalize_pricing_value(candidate_value)
            normalized_request = _normalize_pricing_value(request_value)

            if normalized_request is None:
                matched = False
                break

            if normalized_candidate != normalized_request:
                matched = False
                break

            score += 1

        if matched and score > best_score:
            best_match = candidate
            best_score = score

    return best_match

@router.post("/generate")
@limiter.limit("10/minute")
async def start_generation_task(
    request: Request,
    gen_request: GenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_verified_user)
):
    # Map simple model names to KIE model names
    model_mapping = {
        "face_swap": "flux-2/pro-image-to-image",
        "remove_bg": "recraft/remove-background",
        "upscale": "topaz/image-upscale",
        "colorize": "flux-kontext-pro",
        "style_transfer": "flux-kontext-pro",
        "restore": "recraft/crisp-upscale",
        "cartoonize": "flux-kontext-pro",
        "text_to_3d": "flux-2/pro-text-to-image"
    }

    mapped_model = model_mapping.get(gen_request.model, gen_request.model) if gen_request.model else ""
    mapped_inputs = gen_request.inputs.copy() if gen_request.inputs else {}

    prompt_candidates: list[str] = []
    for value in (
        mapped_inputs.get("prompt"),
        mapped_inputs.get("character_prompt"),
        mapped_inputs.get("safety_instruction"),
        mapped_inputs.get("text"),
    ):
        if isinstance(value, str):
            prompt_candidates.append(value)

    dialogue_value = mapped_inputs.get("dialogue")
    if isinstance(dialogue_value, list):
        for item in dialogue_value:
            if isinstance(item, dict) and isinstance(item.get("text"), str):
                prompt_candidates.append(item["text"])

    multi_prompt_value = mapped_inputs.get("multi_prompt")
    if isinstance(multi_prompt_value, list):
        for item in multi_prompt_value:
            if isinstance(item, dict) and isinstance(item.get("prompt"), str):
                prompt_candidates.append(item["prompt"])

    for candidate in prompt_candidates:
        prompt_issue = find_prompt_safety_issue(candidate)
        if prompt_issue:
            raise HTTPException(status_code=400, detail=prompt_issue["detail"])

    # Determine category if not explicitly provided
    category = gen_request.category if gen_request.category else ""
    if not category:
        model_name_lower = mapped_model.lower()
        if any(x in model_name_lower for x in ["video", "kling", "hailuo", "wan", "runway", "luma", "veo", "sora"]):
            category = "video"
        elif any(x in model_name_lower for x in ["audio", "music", "elevenlabs", "suno"]):
            category = "audio"
        else:
            category = "image"

    # Define model-specific parameter mapping
    # 1. Image Generation Models (Flux, Google, Ideogram, etc.)
    image_gen_models = [
        "flux-2/pro-text-to-image",
        "flux-2/flex-text-to-image",
        "flux-2/pro-image-to-image",
        "flux-2/flex-image-to-image",
        "google/imagen4",
        "ideogram/v3-text-to-image",
        "qwen/text-to-image",
        "bytedance/seedream-v4-text-to-image",
        "seedream/4.5-text-to-image",
        "bytedance/seedream",
        "z-image"
    ]

    if mapped_model in image_gen_models or mapped_model in GOOGLE_IMAGEN_MODELS or mapped_model in {NANOBANANA_MODEL, NANOBANANA_PRO_MODEL, GOOGLE_NANO_BANANA_MODEL, GOOGLE_NANO_BANANA_EDIT_MODEL} or category == "image" or category == "images":
        # Ensure prompt
        if "prompt" not in mapped_inputs or not mapped_inputs["prompt"]:
            # Load dynamic prompts from DB SiteSettings
            from models.admin import SiteSetting
            import logging

            def get_dynamic_prompt(key: str, default: str) -> str:
                setting = db.query(SiteSetting).filter(SiteSetting.key == key).first()
                return setting.value if setting else default

            if gen_request.model == "face_swap":
                mapped_inputs["prompt"] = get_dynamic_prompt("prompt_face_swap", "Perform a highly realistic and seamless face swap using the provided reference image. Keep the original background, pose, and lighting perfectly intact. The swapped face should blend completely naturally with the subject's skin tone, expressions, and shadows.")
            elif gen_request.model == "colorize":
                mapped_inputs["prompt"] = get_dynamic_prompt("prompt_colorize", "Colorize this black and white image realistically, making sure the colors match exactly with the historical or natural context of the scene.")
            elif gen_request.model == "style_transfer":
                mapped_inputs["prompt"] = get_dynamic_prompt("prompt_style_transfer", "Restyle the uploaded image with a polished artistic treatment while preserving the main subject, composition, and overall readability.")
            elif gen_request.model == "cartoonize":
                mapped_inputs["prompt"] = get_dynamic_prompt("prompt_cartoonize", "Turn this into a high-quality 3D Disney Pixar or anime style cartoon image. Retain the core subject's identity and background elements but transform them completely into a stylized, colorful illustration.")
            else:
                mapped_inputs["prompt"] = f"A professional quality AI processing of the input for {gen_request.model} effect"

        if mapped_model in {NANOBANANA_MODEL, NANOBANANA_PRO_MODEL}:
            input_resolution = str(gen_request.resolution) if gen_request.resolution else ""
            aspect_ratio = str(mapped_inputs.get("aspect_ratio") or "").strip()
            if aspect_ratio not in NANOBANANA_ASPECT_RATIOS:
                aspect_ratio = input_resolution if input_resolution in NANOBANANA_ASPECT_RATIOS else "auto"
            mapped_inputs["aspect_ratio"] = aspect_ratio

            resolution = str(mapped_inputs.get("resolution") or "").strip().upper()
            if resolution not in NANOBANANA_RESOLUTIONS:
                resolution = str(gen_request.resolution or "").strip().upper()
            mapped_inputs["resolution"] = resolution if resolution in NANOBANANA_RESOLUTIONS else "1K"

            output_format = str(mapped_inputs.get("output_format") or "jpg").strip().lower()
            mapped_inputs["output_format"] = "png" if output_format == "png" else "jpg"
            if mapped_model == NANOBANANA_MODEL:
                mapped_inputs["google_search"] = _coerce_bool(mapped_inputs.get("google_search"), False)
            else:
                mapped_inputs.pop("google_search", None)

            image_input = _coerce_str_list(mapped_inputs.get("image_input"))
            for key in ("image", "image_url", "input_urls", "image_urls", "reference_image_urls"):
                image_input.extend(_coerce_str_list(mapped_inputs.get(key)))
            unique_image_input = list(dict.fromkeys(image_input))
            if unique_image_input:
                mapped_inputs["image_input"] = unique_image_input[:14 if mapped_model == NANOBANANA_MODEL else 8]
            else:
                mapped_inputs.pop("image_input", None)

            for key in ("image", "image_url", "input_urls", "image_urls", "reference_image_urls"):
                mapped_inputs.pop(key, None)
        elif mapped_model == GOOGLE_NANO_BANANA_MODEL:
            image_size = str(mapped_inputs.get("image_size") or mapped_inputs.get("aspect_ratio") or gen_request.resolution or "").strip()
            mapped_inputs["image_size"] = image_size if image_size in GOOGLE_NANO_IMAGE_SIZES else "1:1"

            output_format = str(mapped_inputs.get("output_format") or "png").strip().lower()
            mapped_inputs["output_format"] = "jpeg" if output_format == "jpeg" else "png"
            mapped_inputs.pop("resolution", None)
            mapped_inputs.pop("aspect_ratio", None)
        elif mapped_model == GOOGLE_NANO_BANANA_EDIT_MODEL:
            image_urls = _coerce_str_list(mapped_inputs.get("image_urls"))
            for key in ("image", "image_url", "input_urls", "image_input", "reference_image_urls"):
                image_urls.extend(_coerce_str_list(mapped_inputs.get(key)))
            unique_image_urls = list(dict.fromkeys(image_urls))
            if not unique_image_urls:
                raise HTTPException(status_code=400, detail="Reference image is required for Nano Banana Edit")
            mapped_inputs["image_urls"] = unique_image_urls[:10]

            image_size = str(mapped_inputs.get("image_size") or mapped_inputs.get("aspect_ratio") or gen_request.resolution or "").strip()
            mapped_inputs["image_size"] = image_size if image_size in GOOGLE_NANO_EDIT_IMAGE_SIZES else "1:1"

            output_format = str(mapped_inputs.get("output_format") or "png").strip().lower()
            mapped_inputs["output_format"] = "jpeg" if output_format == "jpeg" else "png"
            mapped_inputs.pop("resolution", None)
            mapped_inputs.pop("aspect_ratio", None)
            for key in ("image", "image_url", "input_urls", "image_input", "reference_image_urls"):
                mapped_inputs.pop(key, None)
        elif mapped_model in GOOGLE_IMAGEN_MODELS:
            aspect_ratio = str(mapped_inputs.get("aspect_ratio") or gen_request.resolution or "").strip()
            mapped_inputs["aspect_ratio"] = aspect_ratio if aspect_ratio in GOOGLE_IMAGEN_ASPECT_RATIOS else ("16:9" if mapped_model == "google/imagen4-fast" else "1:1")

            negative_prompt = str(mapped_inputs.get("negative_prompt") or "").strip()
            if negative_prompt:
                mapped_inputs["negative_prompt"] = negative_prompt
            else:
                mapped_inputs.pop("negative_prompt", None)

            seed = mapped_inputs.get("seed")
            if seed in ("", None):
                mapped_inputs.pop("seed", None)
            else:
                mapped_inputs["seed"] = seed

            if mapped_model == "google/imagen4-fast":
                num_images = str(mapped_inputs.get("num_images") or "1").strip()
                mapped_inputs["num_images"] = num_images if num_images in {"1", "2", "3", "4"} else "1"
            else:
                mapped_inputs.pop("num_images", None)

            for key in ("resolution", "image", "image_url", "input_urls", "image_urls", "image_input", "reference_image_urls"):
                mapped_inputs.pop(key, None)
        else:
            # 1. Handle Aspect Ratio
            # If the input resolution is an aspect ratio (e.g. 1:1), use it as aspect_ratio
            input_resolution = str(gen_request.resolution) if gen_request.resolution else ""
            if "aspect_ratio" not in mapped_inputs:
                if ":" in input_resolution:
                    mapped_inputs["aspect_ratio"] = input_resolution
                else:
                    mapped_inputs["aspect_ratio"] = "1:1"

            # 2. Handle Resolution (Mandatory for many KIE models)
            # If resolution is missing or is just an aspect ratio, provide a real resolution string
            if "resolution" not in mapped_inputs or ":" in str(mapped_inputs.get("resolution", "")):
                # Explicit format passed from frontend for flux
                if gen_request.resolution and gen_request.resolution in ["1K", "2K", "4K"]:
                    mapped_inputs["resolution"] = gen_request.resolution
                else:
                    # Fallback for models that require a specific resolution format
                    if "flux" in mapped_model.lower():
                        mapped_inputs["resolution"] = "1K" # Flux-2 often prefers 1K, 2K
                    elif "seedream-v4" in mapped_model.lower() and "image_resolution" not in mapped_inputs:
                        mapped_inputs["image_resolution"] = "1K"
                    else:
                        if "seedream" not in mapped_model and "qwen" not in mapped_model and "ideogram" not in mapped_model:
                            mapped_inputs["resolution"] = "1024x1024" # Standard default

            # 3. Model-Specific Key Mapping
            # Flux Kontext specific (uses aspectRatio instead of aspect_ratio)
            if "flux-kontext" in mapped_model:
                mapped_inputs["aspectRatio"] = mapped_inputs.pop("aspect_ratio", "1:1")

    # 2. Video/Audio Generation Models
    if category in ["video", "audio"] or any(x in mapped_model for x in ["hailuo", "wan", "kling", "veo", "suno", "elevenlabs", "sora"]):
        if "prompt" not in mapped_inputs or not mapped_inputs["prompt"]:
             mapped_inputs["prompt"] = "A high quality audio generation" if category == "audio" else "A cinematic video shot"

        # Map duration and resolution
        if "duration" not in mapped_inputs:
            mapped_inputs["duration"] = gen_request.duration if gen_request.duration else (15 if "suno" in mapped_model else 5)
        else:
            try:
                mapped_inputs["duration"] = int(mapped_inputs["duration"])
            except (TypeError, ValueError):
                mapped_inputs["duration"] = gen_request.duration if gen_request.duration else (15 if "suno" in mapped_model else 5)

        if category == "video":
            if "resolution" not in mapped_inputs:
                if gen_request.resolution and ("p" in str(gen_request.resolution).lower() or str(gen_request.resolution).lower() == "4k"):
                    mapped_inputs["resolution"] = gen_request.resolution
                else:
                    mapped_inputs["resolution"] = "1080p"

            if "aspect_ratio" not in mapped_inputs:
                if gen_request.resolution and ":" in str(gen_request.resolution):
                    mapped_inputs["aspect_ratio"] = gen_request.resolution
                else:
                    mapped_inputs["aspect_ratio"] = "16:9"
            mapped_inputs = _normalize_video_inputs(mapped_model, mapped_inputs, gen_request)

        # Audio/Music specific cleanups
        if category == "audio" or "elevenlabs" in mapped_model or "suno" in mapped_model:
            if "resolution" in mapped_inputs:
                del mapped_inputs["resolution"]
            # Suno often wants 'make_instrumental' or similar, but let's keep it simple
            if "suno" in mapped_model:
                if "title" not in mapped_inputs:
                    mapped_inputs["title"] = "AI Song"
                if "tags" not in mapped_inputs:
                    mapped_inputs["tags"] = "pop, melodic"

    if mapped_model.startswith("elevenlabs/"):
        mapped_inputs = normalize_elevenlabs_inputs(mapped_model, mapped_inputs)
        if mapped_model == "elevenlabs/text-to-dialogue-v3":
            dialogue = mapped_inputs.get("dialogue") or []
            if not dialogue:
                raise HTTPException(status_code=400, detail="Dialogue lines are empty or invalid")
        else:
            if not str(mapped_inputs.get("text", "")).strip():
                raise HTTPException(status_code=400, detail="Text is required for voice generation")

    # 3. Simple Tools (Upscale, Colorize, etc.)
    if "topaz/image-upscale" in mapped_model or "upscale" in gen_request.model:
        # Topaz expects upscale_factor instead of scale, and it must be a string '1', '2', '4', '8'
        scale = mapped_inputs.pop("scale", None)
        if not scale and gen_request.resolution and "x" in str(gen_request.resolution).lower():
            try:
                scale = str(float(str(gen_request.resolution).lower().replace("x", "")))
            except:
                scale = "4"

        # Must enforce enum exactly
        if str(scale) not in ['1', '2', '4', '8']:
            # Try parsing and rounding if it's numeric like 2.0 or 4.0
            try:
                int_scale = int(float(scale))
                if str(int_scale) in ['1', '2', '4', '8']:
                    scale = str(int_scale)
                else:
                    scale = "4"
            except:
                scale = "4"

        mapped_inputs["upscale_factor"] = str(scale) if scale else "4"

        # Topaz only supports image_url and upscale_factor. Remove prompt, resolution, etc.
        mapped_inputs.pop("prompt", None)
        mapped_inputs.pop("resolution", None)
        mapped_inputs.pop("aspect_ratio", None)

    if "recraft/remove-background" in mapped_model or "remove_bg" in gen_request.model:
        if "resolution" in mapped_inputs:
            del mapped_inputs["resolution"]

    # 4. Map Image Input Keys Based on Targeted Model
    # Extracts image, image_url, input_urls, image_urls, etc. into a uniform string and sets the expected API key
    if mapped_model not in {NANOBANANA_MODEL, NANOBANANA_PRO_MODEL, GOOGLE_NANO_BANANA_MODEL, GOOGLE_NANO_BANANA_EDIT_MODEL} and mapped_model not in GOOGLE_IMAGEN_MODELS and mapped_model not in VIDEO_SPECIAL_MODELS:
        input_image = mapped_inputs.pop("image", None) or mapped_inputs.pop("image_url", None) or mapped_inputs.pop("video", None) or mapped_inputs.pop("audio", None)

        if not input_image:
            for key in ["input_urls", "image_urls", "image_input", "reference_image_urls"]:
                if mapped_inputs.get(key) and isinstance(mapped_inputs[key], list) and len(mapped_inputs[key]) > 0:
                    input_image = mapped_inputs.pop(key)[0]
                    break

        if input_image:
            if "flux-2/pro-image-to-image" in mapped_model or "flux-2/flex-image-to-image" in mapped_model:
                mapped_inputs["input_urls"] = [input_image]
            elif mapped_model in ["recraft/remove-background", "recraft/crisp-upscale"]:
                mapped_inputs["image"] = input_image
            elif "seedream" in mapped_model and "edit" in mapped_model:
                mapped_inputs["image_urls"] = [input_image]
            elif "ideogram" in mapped_model and "character" in mapped_model:
                mapped_inputs["reference_image_urls"] = [input_image]
            else:
                mapped_inputs["image_url"] = input_image

    pricing_context = _extract_pricing_context(category, mapped_model, mapped_inputs, gen_request)
    pricing = _select_best_pricing(db, category, mapped_model, pricing_context)
    if mapped_model in {
        VEO_31_TEXT_FAST_MODEL,
        VEO_31_TEXT_QUALITY_MODEL,
        VEO_31_IMAGE_FAST_MODEL,
        VEO_31_IMAGE_QUALITY_MODEL,
        VEO_31_REFERENCE_FAST_MODEL,
        VEO_31_EXTEND_FAST_MODEL,
        VEO_31_EXTEND_QUALITY_MODEL,
    } and pricing is None:
        raise HTTPException(status_code=400, detail="VEO pricing is not configured yet")
    cost = pricing.cost if pricing else 1.5 # Стоимость генерации (по умолчанию 1.5)

    if current_user.balance < cost:
        log_admin_event(
            level="WARNING",
            scope="generation",
            event="insufficient_credits",
            message=f"Generation rejected for user #{current_user.id}: not enough credits",
            user_id=current_user.id,
            details={"model": mapped_model, "cost": cost, "balance": current_user.balance},
            path=str(request.url.path),
            method=request.method,
        )
        raise HTTPException(status_code=400, detail="Not enough credits")

    # 2. Списываем кредиты и создаем Task в БД (со статусом pending)
    current_user.balance -= cost

    # Извлекаем URL если он есть, чтобы сохранить в input_url
    input_url = ""
    # Для старых моделей (простые строки)
    if gen_request.inputs.get("image"):
        input_url = gen_request.inputs.get("image")
    elif gen_request.inputs.get("video"):
        input_url = gen_request.inputs.get("video")
    elif gen_request.inputs.get("audio"):
        input_url = gen_request.inputs.get("audio")
    # Для новых моделей kie.ai (которые принимают массивы)
    elif gen_request.inputs.get("input_urls") and isinstance(gen_request.inputs.get("input_urls"), list) and len(gen_request.inputs.get("input_urls")) > 0:
        input_url = gen_request.inputs.get("input_urls")[0]
    elif gen_request.inputs.get("image_urls") and isinstance(gen_request.inputs.get("image_urls"), list) and len(gen_request.inputs.get("image_urls")) > 0:
        input_url = gen_request.inputs.get("image_urls")[0]
    elif gen_request.inputs.get("image_input") and isinstance(gen_request.inputs.get("image_input"), list) and len(gen_request.inputs.get("image_input")) > 0:
        input_url = gen_request.inputs.get("image_input")[0]
    elif gen_request.inputs.get("video_urls") and isinstance(gen_request.inputs.get("video_urls"), list) and len(gen_request.inputs.get("video_urls")) > 0:
        input_url = gen_request.inputs.get("video_urls")[0]
    elif gen_request.inputs.get("character_file_url") and isinstance(gen_request.inputs.get("character_file_url"), list) and len(gen_request.inputs.get("character_file_url")) > 0:
        input_url = gen_request.inputs.get("character_file_url")[0]
    elif gen_request.inputs.get("video_url"):
        input_url = gen_request.inputs.get("video_url")
    elif gen_request.inputs.get("audio_url"):
        input_url = gen_request.inputs.get("audio_url")

    # Fallback: Save text prompt to input_url if nothing else is found
    if not input_url and mapped_inputs.get("prompt"):
        input_url = mapped_inputs.get("prompt")

    prompt_text = next((candidate.strip() for candidate in prompt_candidates if candidate and candidate.strip()), None)
    settings_snapshot = {
        key: value
        for key, value in {
            **pricing_context,
            "model": mapped_model,
            "category": category,
        }.items()
        if value not in (None, "", [], {})
    }

    new_task = Task(
        user_id=current_user.id,
        task_id_vendor=None, # Будет обновлено Celery worker'ом
        tool_type="general",
        category=category,
        model=mapped_model,
        resolution=gen_request.resolution,
        duration=gen_request.duration,
        is_public=gen_request.is_public,
        input_url=input_url,
        prompt=prompt_text,
        settings_snapshot_json=json.dumps(settings_snapshot, ensure_ascii=False) if settings_snapshot else None,
        cost=cost,
        status="pending",
        provider_status="queued_locally",
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    create_generation_notification(db, task=new_task, kind="generation_queued", dedupe=True)
    db.commit()
    log_admin_event(
        level="INFO",
        scope="generation",
        event="generation_requested",
        message=f"Generation requested for task #{new_task.id}",
        task_id=new_task.id,
        user_id=current_user.id,
        path=str(request.url.path),
        method=request.method,
        details={
            "model": mapped_model,
            "category": category,
            "cost": cost,
            "resolution": gen_request.resolution,
            "duration": gen_request.duration,
        },
    )

    # Normalize local uploads before the task leaves our system so providers
    # always receive absolute asset URLs, even if the worker was restarted later.
    mapped_inputs = _normalize_public_asset_inputs(mapped_inputs)

    # 3. Отправляем в Celery для асинхронного выполнения
    from services.tasks import generate_kie_task
    try:
        generate_kie_task.delay(new_task.id, mapped_model, mapped_inputs)
    except Exception as exc:
        new_task.status = "failed"
        new_task.provider_status = "queue_failed"
        new_task.error_message = "Failed to enqueue generation"
        new_task.error_details = repr(exc)
        new_task.completed_at = datetime.now(timezone.utc)
        refund_task_credits_once(
            db,
            new_task,
            reason="celery_enqueue_failed",
            error_message=str(exc),
            notify=True,
        )
        db.commit()
        log_admin_exception(
            scope="generation",
            event="generation_enqueue_failed",
            message=f"Failed to enqueue generation task #{new_task.id}",
            exc=exc,
            task_id=new_task.id,
            user_id=current_user.id,
            details={"model": mapped_model},
        )
        raise HTTPException(status_code=502, detail="Failed to start generation. Credits were returned.")
    log_admin_event(
        level="INFO",
        scope="generation",
        event="generation_enqueued",
        message=f"Generation task #{new_task.id} sent to Celery",
        task_id=new_task.id,
        user_id=current_user.id,
        details={"model": mapped_model},
    )

    return {"task_id": new_task.id, "status": new_task.status, "message": "Generation queued successfully"}

@router.post("/suno/callback")
async def suno_callback(request: Request, db: Session = Depends(get_db)):
    """Webhook called by Suno/KIE when music generation completes."""
    webhook_token = request.query_params.get("token") or request.headers.get("x-webhook-token")
    if not is_valid_shared_secret(webhook_token, settings.SUNO_CALLBACK_TOKEN):
        raise HTTPException(status_code=403, detail="Invalid webhook token")

    try:
        body = await request.json()
    except Exception:
        return {"status": "ignored"}

    callback_type = body.get("callbackType") or body.get("type", "")
    if callback_type not in ("complete", "COMPLETE", "first", "FIRST"):
        return {"status": "ignored"}

    task_id_vendor = body.get("taskId") or (body.get("data") or {}).get("taskId")
    if not task_id_vendor:
        return {"status": "no_task_id"}

    # Stored with suno/ prefix
    stored_vendor_id = f"suno/{task_id_vendor}"
    task = db.query(Task).filter(Task.task_id_vendor == stored_vendor_id).first()
    if not task or task.status == "success":
        return {"status": "ok"}

    suno_data = (body.get("data") or {}).get("sunoData") or []
    if not suno_data and isinstance(body.get("response"), dict):
        suno_data = body["response"].get("sunoData", [])

    if suno_data and isinstance(suno_data, list):
        audio_url = suno_data[0].get("audioUrl")
        if audio_url:
            task.status = "success"
            task.output_url = audio_url
            task.provider_status = "SUCCESS"
            task.completed_at = datetime.now(timezone.utc)
            task.error_message = None
            task.error_details = None
            create_generation_notification(db, task=task, kind="generation_completed", dedupe=True)
            db.commit()
            log_admin_event(
                level="INFO",
                scope="generation",
                event="suno_callback_success",
                message=f"Suno callback completed task #{task.id}",
                task_id=task.id,
                user_id=task.user_id,
                details={"vendor_task_id": stored_vendor_id, "output_url": audio_url},
            )

    return {"status": "ok"}


@router.get("/status/{task_id}")
async def get_task_status(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Если таска все еще обрабатывается, дёргаем KIE API
    if task.status == "processing" and task.task_id_vendor:
        try:
            vendor_status = await check_task_status(task.task_id_vendor)
            if vendor_status.get("status") == "success":
                task.status = "success"
                task.output_url = vendor_status.get("output_url")
                task.provider_status = vendor_status.get("provider_status")
                task.completed_at = datetime.now(timezone.utc)
                task.error_message = None
                task.error_details = None
                create_generation_notification(db, task=task, kind="generation_completed", dedupe=True)
                db.commit()
                log_admin_event(
                    level="INFO",
                    scope="generation",
                    event="generation_completed",
                    message=f"Generation task #{task.id} completed successfully",
                    task_id=task.id,
                    user_id=task.user_id,
                    details={
                        "vendor_task_id": task.task_id_vendor,
                        "provider_status": vendor_status.get("provider_status"),
                        "output_url": vendor_status.get("output_url"),
                    },
                )
            elif vendor_status.get("status") in ["failed", "error"]:
                task.status = "failed"
                task.provider_status = vendor_status.get("provider_status")
                task.error_message = vendor_status.get("error_message") or "Provider reported failure"
                task.error_details = str(vendor_status.get("raw_response") or "")
                task.completed_at = datetime.now(timezone.utc)
                refund_task_credits_once(
                    db,
                    task,
                    reason="provider_reported_failure",
                    error_message=task.error_message,
                    notify=True,
                )
                db.commit()
                log_admin_event(
                    level="ERROR",
                    scope="generation",
                    event="generation_failed",
                    message=f"Generation task #{task.id} failed during provider status check",
                    task_id=task.id,
                    user_id=task.user_id,
                    details={
                        "vendor_task_id": task.task_id_vendor,
                        "provider_status": vendor_status.get("provider_status"),
                        "error_message": task.error_message,
                        "raw_response": vendor_status.get("raw_response"),
                    },
                )
        except Exception as exc:
            log_admin_exception(
                scope="generation",
                event="status_poll_exception",
                message=f"Status polling failed for task #{task.id}",
                exc=exc,
                task_id=task.id,
                user_id=task.user_id,
                details={"vendor_task_id": task.task_id_vendor},
            )
            pass # Игнорируем ошибки сети при проверке статуса, проверим в след раз

    return {
        "task_id": task.id,
        "status": task.status,
        "result_url": task.output_url,
        "error_message": task.error_message,
    }

@router.get("/my-creations")
def get_my_creations(
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(Task).filter(Task.user_id == current_user.id).order_by(Task.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": max(1, (total + per_page - 1) // per_page),
    }

@router.get("/likes")
def get_my_likes(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    likes = db.query(Like).filter(Like.user_id == current_user.id).all()
    if not likes:
        return []
    task_ids = [like.task_id for like in likes]
    return db.query(Task).filter(Task.id.in_(task_ids)).all()

@router.post("/likes/{task_id}")
def toggle_like(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    like = db.query(Like).filter(Like.user_id == current_user.id, Like.task_id == task_id).first()
    if like:
        db.delete(like)
        db.commit()
        return {"status": "unliked"}
    else:
        new_like = Like(user_id=current_user.id, task_id=task_id)
        db.add(new_like)
        db.commit()
        return {"status": "liked"}

@router.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return {"status": "success", "message": "Task deleted successfully"}

class FeedbackSchema(BaseModel):
    message: str

@router.post("/feedback")
def submit_feedback(data: FeedbackSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    fb = Feedback(email=current_user.email, message=data.message)
    db.add(fb)
    db.commit()
    return {"status": "success"}

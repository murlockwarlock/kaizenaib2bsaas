import httpx
import logging
from urllib.parse import urlencode
from core.config import settings

logger = logging.getLogger(__name__)

SUNO_PREFIX = "suno/"
RUNWAY_GENERATE_PREFIX = "runway-generate/"
RUNWAY_EXTEND_PREFIX = "runway-extend/"
ALEPH_PREFIX = "aleph/"
FLUX_KONTEXT_PREFIX = "flux-kontext/"
VEO_GENERATE_PREFIX = "veo-generate/"
VEO_EXTEND_PREFIX = "veo-extend/"
RUNWAY_GENERATE_MODEL = "runway/generate"
RUNWAY_EXTEND_MODEL = "runway/extend"
RUNWAY_ALEPH_MODEL = "runway/aleph-generate"
FLUX_KONTEXT_MODELS = {"flux-kontext-pro", "flux-kontext-max"}
VEO_TEXT_FAST_MODEL = "veo-3.1/text-fast"
VEO_TEXT_QUALITY_MODEL = "veo-3.1/text-quality"
VEO_IMAGE_FAST_MODEL = "veo-3.1/image-fast"
VEO_IMAGE_QUALITY_MODEL = "veo-3.1/image-quality"
VEO_REFERENCE_FAST_MODEL = "veo-3.1/reference-fast"
VEO_EXTEND_FAST_MODEL = "veo-3.1/extend-fast"
VEO_EXTEND_QUALITY_MODEL = "veo-3.1/extend-quality"
VEO_GENERATE_MODELS = {
    VEO_TEXT_FAST_MODEL,
    VEO_TEXT_QUALITY_MODEL,
    VEO_IMAGE_FAST_MODEL,
    VEO_IMAGE_QUALITY_MODEL,
    VEO_REFERENCE_FAST_MODEL,
}
VEO_EXTEND_MODELS = {VEO_EXTEND_FAST_MODEL, VEO_EXTEND_QUALITY_MODEL}
KIE_MODEL_NAME_ALIASES = {
    "bytedance/seedance-1-5-pro": "bytedance/seedance-1.5-pro",
    "kling-3/motion-control": "kling-2.6/motion-control",
}
ELEVENLABS_SHARED_VOICES = {
    "Alice",
    "Bill",
    "Brian",
    "Callum",
    "Charlie",
    "Chris",
    "Daniel",
    "Eric",
    "George",
    "Jessica",
    "Laura",
    "Liam",
    "Lily",
    "Matilda",
    "River",
    "Roger",
    "Sarah",
    "Will",
}
ELEVENLABS_DEFAULT_TTS_VOICE = "Sarah"
ELEVENLABS_DEFAULT_DIALOGUE_VOICE = "Roger"
ELEVENLABS_VOICE_ALIASES = {
    "british male": "Roger",
    "american female": "Sarah",
    "soft female": "Lily",
    "deep male": "Brian",
    "energetic kid": "Charlie",
    "professional narrator": "Roger",
    "narrator": "Roger",
    "female narrator": "Sarah",
    "male narrator": "Roger",
    "american male": "Will",
    "british female": "Jessica",
}

def _is_suno(model: str) -> bool:
    return model.startswith(SUNO_PREFIX)

def _is_runway(model: str) -> bool:
    return model in {RUNWAY_GENERATE_MODEL, RUNWAY_EXTEND_MODEL, RUNWAY_ALEPH_MODEL}

def _is_flux_kontext(model: str) -> bool:
    return model in FLUX_KONTEXT_MODELS

def _is_veo(model: str) -> bool:
    return model in VEO_GENERATE_MODELS or model in VEO_EXTEND_MODELS


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


def _normalize_public_asset_inputs(value):
    if isinstance(value, str):
        return _absolutize_public_asset_url(value) or value
    if isinstance(value, list):
        return [_normalize_public_asset_inputs(item) for item in value]
    if isinstance(value, dict):
        return {key: _normalize_public_asset_inputs(item) for key, item in value.items()}
    return value

def normalize_elevenlabs_voice(voice: str | None, *, fallback: str) -> str:
    if not voice:
        return fallback

    normalized = str(voice).strip()
    if normalized in ELEVENLABS_SHARED_VOICES:
        return normalized

    lowered = normalized.lower()
    if lowered in ELEVENLABS_VOICE_ALIASES:
        return ELEVENLABS_VOICE_ALIASES[lowered]

    # Basic partial matching for legacy UI labels.
    if "narrator" in lowered:
        return "Roger"
    if "british" in lowered:
        return "Roger"
    if "female" in lowered or "woman" in lowered:
        return "Sarah"
    if "kid" in lowered or "child" in lowered:
        return "Charlie"
    if "deep" in lowered or "low" in lowered:
        return "Brian"

    return fallback

def normalize_elevenlabs_inputs(model: str, inputs: dict) -> dict:
    normalized = dict(inputs or {})

    if model == "elevenlabs/text-to-dialogue-v3":
        dialogue = normalized.get("dialogue")
        if not isinstance(dialogue, list):
            normalized["dialogue"] = []
            return normalized

        cleaned_dialogue = []
        for item in dialogue:
            if not isinstance(item, dict):
                continue
            text = str(item.get("text", "")).strip()
            if not text:
                continue
            cleaned_dialogue.append({
                "text": text,
                "voice": normalize_elevenlabs_voice(item.get("voice"), fallback=ELEVENLABS_DEFAULT_DIALOGUE_VOICE),
            })
        normalized["dialogue"] = cleaned_dialogue
        return normalized

    if model in {"elevenlabs/text-to-speech-turbo-2-5", "elevenlabs/text-to-speech-multilingual-v2"}:
        normalized["voice"] = normalize_elevenlabs_voice(
            normalized.get("voice"),
            fallback=ELEVENLABS_DEFAULT_TTS_VOICE,
        )
        if "text" in normalized:
            normalized["text"] = str(normalized["text"]).strip()
        return normalized

    return normalized

def get_kie_remaining_credits_sync() -> int | None:
    if settings.KIE_API_KEY == "mock_key":
        return 9999

    try:
        with httpx.Client(timeout=15) as client:
            response = client.get(
                f"{settings.KIE_API_URL}/api/v1/chat/credit",
                headers={"Authorization": f"Bearer {settings.KIE_API_KEY}"}
            )
            response.raise_for_status()
            data = response.json()
            if isinstance(data, dict) and data.get("code") == 200:
                return int(data.get("data"))
            logger.warning("Unexpected KIE credit response: %s", data)
    except Exception:
        logger.exception("Failed to fetch KIE remaining credits")
    return None

async def request_kie_generation(model: str, inputs: dict):
    provider_model = KIE_MODEL_NAME_ALIASES.get(model, model)

    if settings.KIE_API_KEY == "mock_key":
        import asyncio
        await asyncio.sleep(1)
        return "mock_task_12345"

    if _is_suno(provider_model):
        return await _request_suno_generation(provider_model, inputs)

    if provider_model.startswith("elevenlabs/"):
        inputs = normalize_elevenlabs_inputs(provider_model, inputs)

    inputs = _normalize_public_asset_inputs(inputs)

    if _is_runway(provider_model):
        if provider_model == RUNWAY_GENERATE_MODEL:
            return await _request_runway_generation(inputs)
        if provider_model == RUNWAY_EXTEND_MODEL:
            return await _request_runway_extend(inputs)
        return await _request_aleph_generation(inputs)

    if _is_flux_kontext(provider_model):
        return await _request_flux_kontext_generation(provider_model, inputs)

    if _is_veo(provider_model):
        if provider_model in VEO_EXTEND_MODELS:
            return await _request_veo_extend(inputs)
        return await _request_veo_generation(provider_model, inputs)

    async with httpx.AsyncClient() as client:
        headers = {
            "Authorization": f"Bearer {settings.KIE_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": provider_model,
            "input": inputs
        }

        logger.info("Requesting KIE Generation for model: %s", provider_model)
        logger.debug("Payload Input: %s", inputs)

        response = await client.post(
            f"{settings.KIE_API_URL}/api/v1/jobs/createTask",
            json=payload,
            headers=headers
        )
        response.raise_for_status()
        data = response.json()

        if not isinstance(data, dict):
            raise ValueError(f"Unexpected response from KIE API: {response.text}")

        task_id = data.get("data", {}).get("taskId") if data.get("data") else None
        if not task_id:
            raise ValueError(f"KIE API Error, no taskId returned. Response: {data}")

        return task_id

async def _request_suno_generation(model: str, inputs: dict):
    """Suno music generation uses a separate endpoint and payload format."""
    suno_model = model[len(SUNO_PREFIX):]  # e.g. "suno/V5" -> "V5"
    async with httpx.AsyncClient(timeout=30) as client:
        headers = {
            "Authorization": f"Bearer {settings.KIE_API_KEY}",
            "Content-Type": "application/json"
        }
        callback_url = ""
        if settings.public_base_url and settings.SUNO_CALLBACK_TOKEN:
            query = urlencode({"token": settings.SUNO_CALLBACK_TOKEN})
            callback_url = f"{settings.public_base_url}/api/v1/ai/suno/callback?{query}"

        payload = {
            "prompt": inputs.get("prompt", ""),
            "model": suno_model,
            "customMode": inputs.get("customMode", False),
            "instrumental": inputs.get("instrumental", False),
        }
        if callback_url:
            payload["callBackUrl"] = callback_url
        if inputs.get("style"):
            payload["style"] = inputs["style"]
        if inputs.get("title"):
            payload["title"] = inputs["title"]
        if inputs.get("negativeTags"):
            payload["negativeTags"] = inputs["negativeTags"]

        logger.info("Requesting Suno generation, model: %s", suno_model)
        response = await client.post(
            f"{settings.KIE_API_URL}/api/v1/generate",
            json=payload,
            headers=headers
        )
        response.raise_for_status()
        data = response.json()

        if not isinstance(data, dict):
            raise ValueError(f"Unexpected Suno response: {response.text}")

        task_id = data.get("data", {}).get("taskId") if data.get("data") else None
        if not task_id:
            raise ValueError(f"Suno API Error, no taskId returned. Response: {data}")

        # Prefix so status check knows to use Suno endpoint
        return f"{SUNO_PREFIX}{task_id}"

def _normalize_runway_quality(value: str | None) -> str:
    lowered = str(value or "720p").strip().lower()
    return "1080p" if lowered == "1080p" else "720p"

def _normalize_runway_aspect_ratio(value: str | None) -> str:
    ratio = str(value or "16:9").strip()
    return ratio if ratio in {"16:9", "9:16", "4:3", "3:4", "1:1"} else "16:9"

def _normalize_runway_duration(value: str | int | None) -> int:
    duration = str(value or "5").strip()
    return 10 if duration == "10" else 5

async def _request_runway_generation(inputs: dict):
    duration = _normalize_runway_duration(inputs.get("duration"))
    quality = _normalize_runway_quality(inputs.get("resolution"))
    if duration == 10 and quality == "1080p":
        raise ValueError("Runway Generate supports 1080p only for 5-second clips")

    payload = {
        "prompt": str(inputs.get("prompt") or "").strip(),
        "model": f"runway-duration-{duration}-generate",
        "duration": duration,
        "quality": quality,
        "waterMark": str(inputs.get("watermark_text") or "").strip(),
    }
    image_url = str(inputs.get("image_url") or "").strip()
    if image_url:
        payload["imageUrl"] = image_url
    else:
        payload["aspectRatio"] = _normalize_runway_aspect_ratio(inputs.get("aspect_ratio"))

    async with httpx.AsyncClient(timeout=30) as client:
        headers = {
            "Authorization": f"Bearer {settings.KIE_API_KEY}",
            "Content-Type": "application/json",
        }
        response = await client.post(
            f"{settings.KIE_API_URL}/api/v1/runway/generate",
            json=payload,
            headers=headers,
        )
        response.raise_for_status()
        data = response.json()
        task_id = data.get("data", {}).get("taskId") if isinstance(data, dict) and data.get("data") else None
        if not task_id:
            raise ValueError(f"Runway API Error, no taskId returned. Response: {data}")
        return f"{RUNWAY_GENERATE_PREFIX}{task_id}"

async def _request_runway_extend(inputs: dict):
    payload = {
        "taskId": str(inputs.get("origin_task_id") or "").strip(),
        "prompt": str(inputs.get("prompt") or "").strip(),
        "quality": _normalize_runway_quality(inputs.get("resolution")),
        "waterMark": str(inputs.get("watermark_text") or "").strip(),
        "expandPrompt": bool(inputs.get("enable_prompt_expansion")),
    }
    image_url = str(inputs.get("image_url") or "").strip()
    if image_url:
        payload["imageUrl"] = image_url

    async with httpx.AsyncClient(timeout=30) as client:
        headers = {
            "Authorization": f"Bearer {settings.KIE_API_KEY}",
            "Content-Type": "application/json",
        }
        response = await client.post(
            f"{settings.KIE_API_URL}/api/v1/runway/extend",
            json=payload,
            headers=headers,
        )
        response.raise_for_status()
        data = response.json()
        task_id = data.get("data", {}).get("taskId") if isinstance(data, dict) and data.get("data") else None
        if not task_id:
            raise ValueError(f"Runway Extend API Error, no taskId returned. Response: {data}")
        return f"{RUNWAY_EXTEND_PREFIX}{task_id}"

async def _request_aleph_generation(inputs: dict):
    payload = {
        "prompt": str(inputs.get("prompt") or "").strip(),
        "videoUrl": str(inputs.get("video_url") or "").strip(),
        "waterMark": str(inputs.get("watermark_text") or "").strip(),
        "uploadCn": False,
    }
    aspect_ratio = str(inputs.get("aspect_ratio") or "").strip()
    if aspect_ratio:
        payload["aspectRatio"] = aspect_ratio
    reference_image = str(inputs.get("reference_image") or "").strip()
    if reference_image:
        payload["referenceImage"] = reference_image
    seed = inputs.get("seed")
    if isinstance(seed, int):
        payload["seed"] = seed

    async with httpx.AsyncClient(timeout=30) as client:
        headers = {
            "Authorization": f"Bearer {settings.KIE_API_KEY}",
            "Content-Type": "application/json",
        }
        response = await client.post(
            f"{settings.KIE_API_URL}/api/v1/aleph/generate",
            json=payload,
            headers=headers,
        )
        response.raise_for_status()
        data = response.json()
        task_id = data.get("data", {}).get("taskId") if isinstance(data, dict) and data.get("data") else None
        if not task_id:
            raise ValueError(f"Aleph API Error, no taskId returned. Response: {data}")
        return f"{ALEPH_PREFIX}{task_id}"

async def _request_flux_kontext_generation(model: str, inputs: dict):
    payload = {
        "prompt": str(inputs.get("prompt") or "").strip(),
        "model": model if model in FLUX_KONTEXT_MODELS else "flux-kontext-pro",
        "outputFormat": "png" if str(inputs.get("output_format") or "").strip().lower() == "png" else "jpeg",
        "enableTranslation": bool(inputs.get("enable_translation", False)),
        "promptUpsampling": bool(inputs.get("prompt_upsampling", False)),
        "safetyTolerance": int(inputs.get("safety_tolerance", 2) or 2),
        "watermark": str(inputs.get("watermark_text") or "").strip(),
        "uploadCn": False,
    }

    input_image = str(
        inputs.get("inputImage")
        or inputs.get("image_url")
        or inputs.get("image")
        or ""
    ).strip()
    if input_image:
        payload["inputImage"] = input_image

    aspect_ratio = str(inputs.get("aspect_ratio") or "").strip()
    if aspect_ratio:
        payload["aspectRatio"] = aspect_ratio

    payload = {key: value for key, value in payload.items() if value not in ("", None)}

    async with httpx.AsyncClient(timeout=30) as client:
        headers = {
            "Authorization": f"Bearer {settings.KIE_API_KEY}",
            "Content-Type": "application/json",
        }
        response = await client.post(
            f"{settings.KIE_API_URL}/api/v1/flux/kontext/generate",
            json=payload,
            headers=headers,
        )
        response.raise_for_status()
        data = response.json()
        task_id = data.get("data", {}).get("taskId") if isinstance(data, dict) and data.get("data") else None
        if not task_id:
            raise ValueError(f"Flux Kontext API Error, no taskId returned. Response: {data}")
        return f"{FLUX_KONTEXT_PREFIX}{task_id}"

async def _request_veo_generation(model: str, inputs: dict):
    provider_model = "veo3_fast" if model in {VEO_TEXT_FAST_MODEL, VEO_IMAGE_FAST_MODEL, VEO_REFERENCE_FAST_MODEL} else "veo3"
    generation_type = str(inputs.get("generation_type") or "TEXT_2_VIDEO").strip()
    payload = {
        "prompt": str(inputs.get("prompt") or "").strip(),
        "model": provider_model,
        "aspectRatio": str(inputs.get("aspect_ratio") or "16:9").strip(),
        "duration": int(inputs.get("duration") or 5),
        "enableFallback": bool(inputs.get("enable_fallback", False)),
        "generationType": generation_type,
    }

    image_urls = inputs.get("image_urls") or []
    if isinstance(image_urls, list) and image_urls:
        payload["imageUrls"] = image_urls

    payload = {key: value for key, value in payload.items() if value not in ("", None)}

    async with httpx.AsyncClient(timeout=30) as client:
        headers = {
            "Authorization": f"Bearer {settings.KIE_API_KEY}",
            "Content-Type": "application/json",
        }
        response = await client.post(
            f"{settings.KIE_API_URL}/api/v1/veo/generate",
            json=payload,
            headers=headers,
        )
        response.raise_for_status()
        data = response.json()
        task_id = data.get("data", {}).get("taskId") if isinstance(data, dict) and data.get("data") else None
        if not task_id:
            raise ValueError(f"VEO API Error, no taskId returned. Response: {data}")
        return f"{VEO_GENERATE_PREFIX}{task_id}"

async def _request_veo_extend(inputs: dict):
    payload = {
        "taskId": str(inputs.get("origin_task_id") or "").strip(),
        "prompt": str(inputs.get("prompt") or "").strip(),
        "model": "fast" if str(inputs.get("generation_mode") or "").strip() == "fast" else "quality",
        "enableFallback": bool(inputs.get("enable_fallback", False)),
    }
    payload = {key: value for key, value in payload.items() if value not in ("", None)}

    async with httpx.AsyncClient(timeout=30) as client:
        headers = {
            "Authorization": f"Bearer {settings.KIE_API_KEY}",
            "Content-Type": "application/json",
        }
        response = await client.post(
            f"{settings.KIE_API_URL}/api/v1/veo/extend",
            json=payload,
            headers=headers,
        )
        response.raise_for_status()
        data = response.json()
        task_id = data.get("data", {}).get("taskId") if isinstance(data, dict) and data.get("data") else None
        if not task_id:
            raise ValueError(f"VEO Extend API Error, no taskId returned. Response: {data}")
        return f"{VEO_EXTEND_PREFIX}{task_id}"

def _map_vendor_status(status: str | None):
    normalized = str(status or "").strip().lower()
    if normalized in {"success", "succeeded", "completed", "complete"}:
        return "success"
    if normalized in {"failed", "fail", "error", "cancelled", "canceled"}:
        return "failed"
    return "processing"


def _extract_provider_error_message(data: dict | None, fallback: str) -> str:
    if not isinstance(data, dict):
        return fallback
    for key in ("failMsg", "errorMessage", "msg", "message", "error"):
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return fallback

async def _check_runway_status(raw_task_id: str):
    async with httpx.AsyncClient(timeout=30) as client:
        headers = {"Authorization": f"Bearer {settings.KIE_API_KEY}"}
        response = await client.get(
            f"{settings.KIE_API_URL}/api/v1/runway/record-detail",
            params={"taskId": raw_task_id},
            headers=headers,
        )
        response.raise_for_status()
        data = response.json().get("data", {})
        provider_status = data.get("state") or data.get("status")
        video_info = data.get("videoInfo") or {}
        output_url = video_info.get("videoUrl") or data.get("videoUrl")
        internal_status = _map_vendor_status(provider_status)
        return {
            "status": internal_status,
            "output_url": output_url,
            "provider_status": provider_status,
            "raw_response": data,
            "error_message": None if internal_status != "failed" else _extract_provider_error_message(
                data,
                f"Runway returned status {provider_status}",
            ),
        }

async def _check_aleph_status(raw_task_id: str):
    async with httpx.AsyncClient(timeout=30) as client:
        headers = {"Authorization": f"Bearer {settings.KIE_API_KEY}"}
        response = await client.get(
            f"{settings.KIE_API_URL}/api/v1/aleph/record-info",
            params={"taskId": raw_task_id},
            headers=headers,
        )
        response.raise_for_status()
        data = response.json().get("data", {})

        if isinstance(data, dict) and "successFlag" in data:
            success_flag = data.get("successFlag")
            output_url = (data.get("response") or {}).get("resultVideoUrl")
            error_message = _extract_provider_error_message(data, f"Aleph returned successFlag {success_flag}")

            if success_flag == 1:
                internal_status = "success"
            elif error_message and success_flag == 0:
                internal_status = "failed"
            else:
                internal_status = "processing"

            return {
                "status": internal_status,
                "output_url": output_url,
                "provider_status": str(success_flag),
                "raw_response": data,
                "error_message": None if internal_status != "failed" else error_message,
            }

        # Backward-compatible fallback for older payload shapes.
        response = await client.get(
            f"{settings.KIE_API_URL}/api/v1/aleph/record-detail",
            params={"taskId": raw_task_id},
            headers=headers,
        )
        response.raise_for_status()
        data = response.json().get("data", {})
        provider_status = data.get("state") or data.get("status")
        video_info = data.get("videoInfo") or {}
        output_url = video_info.get("videoUrl") or data.get("videoUrl")
        internal_status = _map_vendor_status(provider_status)
        return {
            "status": internal_status,
            "output_url": output_url,
            "provider_status": provider_status,
            "raw_response": data,
            "error_message": None if internal_status != "failed" else _extract_provider_error_message(
                data,
                f"Aleph returned status {provider_status}",
            ),
        }

async def _check_flux_kontext_status(raw_task_id: str):
    async with httpx.AsyncClient(timeout=30) as client:
        headers = {"Authorization": f"Bearer {settings.KIE_API_KEY}"}
        response = await client.get(
            f"{settings.KIE_API_URL}/api/v1/flux/kontext/record-info",
            params={"taskId": raw_task_id},
            headers=headers,
        )
        response.raise_for_status()
        data = response.json().get("data", {})
        success_flag = data.get("successFlag")
        output_url = (data.get("response") or {}).get("resultImageUrl")
        if success_flag == 1:
            internal_status = "success"
        elif success_flag in {2, 3}:
            internal_status = "failed"
        else:
            internal_status = "processing"
        return {
            "status": internal_status,
            "output_url": output_url,
            "provider_status": str(success_flag),
            "raw_response": data,
            "error_message": None if internal_status != "failed" else _extract_provider_error_message(
                data,
                f"Flux Kontext returned successFlag {success_flag}",
            ),
        }

async def _check_veo_status(raw_task_id: str):
    async with httpx.AsyncClient(timeout=30) as client:
        headers = {"Authorization": f"Bearer {settings.KIE_API_KEY}"}
        response = await client.get(
            f"{settings.KIE_API_URL}/api/v1/veo/record-info",
            params={"taskId": raw_task_id},
            headers=headers,
        )
        response.raise_for_status()
        data = response.json().get("data", {})
        success_flag = data.get("successFlag")
        response_data = data.get("response") or {}

        result_urls = response_data.get("resultUrls") or data.get("resultUrls") or []
        output_url = None
        if isinstance(result_urls, list) and result_urls:
            output_url = result_urls[0]
        elif isinstance(response_data.get("resultVideoUrl"), str):
            output_url = response_data.get("resultVideoUrl")
        elif isinstance(data.get("resultVideoUrl"), str):
            output_url = data.get("resultVideoUrl")

        if success_flag == 1:
            internal_status = "success"
        elif success_flag in {2, 3}:
            internal_status = "failed"
        else:
            internal_status = "processing"

        return {
            "status": internal_status,
            "output_url": output_url,
            "provider_status": str(success_flag),
            "raw_response": data,
            "error_message": None if internal_status != "failed" else _extract_provider_error_message(
                data,
                f"VEO returned successFlag {success_flag}",
            ),
        }

async def check_task_status(task_id: str):
    if settings.KIE_API_KEY == "mock_key":
        import asyncio
        await asyncio.sleep(0.5)
        return {
            "status": "success",
            "output_url": "https://via.placeholder.com/800x600?text=Mock+Upscaled+Image"
        }

    if task_id.startswith(SUNO_PREFIX):
        return await _check_suno_status(task_id[len(SUNO_PREFIX):])
    if task_id.startswith(RUNWAY_GENERATE_PREFIX):
        return await _check_runway_status(task_id[len(RUNWAY_GENERATE_PREFIX):])
    if task_id.startswith(RUNWAY_EXTEND_PREFIX):
        return await _check_runway_status(task_id[len(RUNWAY_EXTEND_PREFIX):])
    if task_id.startswith(ALEPH_PREFIX):
        return await _check_aleph_status(task_id[len(ALEPH_PREFIX):])
    if task_id.startswith(FLUX_KONTEXT_PREFIX):
        return await _check_flux_kontext_status(task_id[len(FLUX_KONTEXT_PREFIX):])
    if task_id.startswith(VEO_GENERATE_PREFIX):
        return await _check_veo_status(task_id[len(VEO_GENERATE_PREFIX):])
    if task_id.startswith(VEO_EXTEND_PREFIX):
        return await _check_veo_status(task_id[len(VEO_EXTEND_PREFIX):])

    async with httpx.AsyncClient() as client:
        headers = {
            "Authorization": f"Bearer {settings.KIE_API_KEY}"
        }
        response = await client.get(
            f"{settings.KIE_API_URL}/api/v1/jobs/recordInfo",
            params={"taskId": task_id},
            headers=headers
        )
        response.raise_for_status()
        data = response.json().get("data", {})

        state = data.get("state")

        import json

        result_url = None
        if state == "success":
            try:
                result_json_str = data.get("resultJson", "{}")
                result_json = json.loads(result_json_str)
                if "resultUrls" in result_json and result_json["resultUrls"]:
                    result_url = result_json["resultUrls"][0]
                elif "url" in result_json:
                    result_url = result_json["url"]
                elif "result_url" in result_json:
                    result_url = result_json["result_url"]
            except Exception:
                pass

        internal_status = "processing"
        if state == "success":
            internal_status = "success"
        elif state == "fail":
            internal_status = "failed"

        return {
            "status": internal_status,
            "output_url": result_url,
            "provider_status": state,
            "raw_response": data,
            "error_message": None if internal_status != "failed" else _extract_provider_error_message(
                data,
                f"KIE returned state {state}",
            ),
        }

async def _check_suno_status(raw_task_id: str):
    """Check status for Suno music generation tasks."""
    async with httpx.AsyncClient() as client:
        headers = {
            "Authorization": f"Bearer {settings.KIE_API_KEY}"
        }
        response = await client.get(
            f"{settings.KIE_API_URL}/api/v1/generate/record-info",
            params={"taskId": raw_task_id},
            headers=headers
        )
        response.raise_for_status()
        data = response.json().get("data", {})

        status = data.get("status", "")
        failed_states = {"CREATE_TASK_FAILED", "GENERATE_AUDIO_FAILED", "CALLBACK_EXCEPTION", "SENSITIVE_WORD_ERROR"}

        result_url = None
        if status == "SUCCESS":
            suno_data = data.get("response", {}).get("sunoData", [])
            if suno_data and isinstance(suno_data, list):
                result_url = suno_data[0].get("audioUrl")

        internal_status = "processing"
        if status == "SUCCESS":
            internal_status = "success"
        elif status in failed_states:
            internal_status = "failed"

        return {
            "status": internal_status,
            "output_url": result_url,
            "provider_status": status,
            "raw_response": data,
            "error_message": None if internal_status != "failed" else _extract_provider_error_message(
                data,
                f"Suno returned status {status}",
            ),
        }

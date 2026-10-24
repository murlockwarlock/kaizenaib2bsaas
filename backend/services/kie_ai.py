import asyncio
import json
import logging
from typing import Any
from urllib.parse import urlencode

import httpx

from core.config import settings

logger = logging.getLogger(__name__)

KIE_MAX_STATUS_RETRIES = 3
KIE_RETRY_BACKOFF_SECONDS = 0.5


def _coerce_bool(value: Any, default: bool = False) -> bool:
    """Parse booleans coming from JSON forms without treating 'false' as true."""
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    normalized = str(value).strip().lower()
    if normalized in {"true", "1", "yes", "y", "on"}:
        return True
    if normalized in {"false", "0", "no", "n", "off", ""}:
        return False
    return default


class KieApiError(RuntimeError):
    """A normalized KIE error with enough context for safe business decisions."""

    def __init__(
        self,
        message: str,
        *,
        code: int | str | None = None,
        http_status: int | None = None,
        retriable: bool = False,
        uncertain: bool = False,
        payload: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.http_status = http_status
        self.retriable = retriable
        self.uncertain = uncertain
        self.payload = payload or {}


def _provider_message(payload: Any, fallback: str) -> str:
    if isinstance(payload, dict):
        for key in ("failMsg", "errorMessage", "msg", "message", "error"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()[:1000]
        for key in ("data", "response", "error"):
            nested = payload.get(key)
            if isinstance(nested, dict):
                message = _provider_message(nested, "")
                if message:
                    return message
    return fallback


def _is_transient(code: int | str | None, http_status: int | None) -> bool:
    try:
        numeric_code = int(code) if code is not None else None
    except (TypeError, ValueError):
        numeric_code = None
    return bool(
        numeric_code in {408, 429}
        or (numeric_code is not None and numeric_code >= 500)
        or http_status in {408, 429}
        or (http_status is not None and http_status >= 500)
    )


def _write_outcome_is_uncertain(code: int | str | None, http_status: int | None) -> bool:
    """Return whether a failed write may nevertheless have been accepted.

    KIE can return a provider/body error while keeping HTTP 200. Definite
    client errors (including body-level 4xx and the documented rejected 429)
    cannot have created a task and must be refundable by the worker. Network,
    5xx, and malformed successful responses remain ambiguous for POSTs.
    """
    try:
        numeric_code = int(code) if code is not None else None
    except (TypeError, ValueError):
        numeric_code = None

    if http_status is not None and 400 <= http_status < 500:
        return False
    if numeric_code == 429:
        return False
    if numeric_code is not None and 400 <= numeric_code < 500:
        return False
    return True


async def _request_json(
    method: str,
    path: str,
    *,
    headers: dict[str, str],
    json_payload: dict[str, Any] | None = None,
    params: dict[str, Any] | None = None,
    timeout: float = 30,
    retry_reads: bool = False,
) -> dict[str, Any]:
    """Call KIE and validate both HTTP status and KIE's body-level `code`.

    KIE documents that many `/api/v1/*` errors are returned as HTTP 200 with a
    non-200 `code`, so `raise_for_status()` alone is not sufficient.
    """
    normalized_method = method.upper()
    url = f"{settings.KIE_API_URL.rstrip('/')}{path}"
    # Reads retry all transient failures. Writes normally run once, except
    # KIE's documented 429 rejection, which is guaranteed not to enter the
    # queue and is therefore safe to replay.
    attempts = KIE_MAX_STATUS_RETRIES

    async with httpx.AsyncClient(timeout=timeout) as client:
        for attempt in range(attempts):
            try:
                response = await client.request(
                    normalized_method,
                    url,
                    headers=headers,
                    json=json_payload,
                    params=params,
                )
            except (httpx.TimeoutException, httpx.NetworkError) as exc:
                # A write timeout has unknown outcome. Do not replay it and do
                # not pretend it was rejected; the worker will surface it as a
                # provider confirmation problem instead of creating a duplicate.
                if retry_reads and attempt < attempts - 1:
                    await asyncio.sleep(KIE_RETRY_BACKOFF_SECONDS * (2**attempt))
                    continue
                raise KieApiError(
                    "KIE provider did not respond",
                    retriable=retry_reads,
                    uncertain=normalized_method != "GET",
                ) from exc

            try:
                payload = response.json()
            except ValueError as exc:
                transient = response.status_code >= 500
                if retry_reads and transient and attempt < attempts - 1:
                    await asyncio.sleep(KIE_RETRY_BACKOFF_SECONDS * (2**attempt))
                    continue
                raise KieApiError(
                    "KIE provider returned an invalid response",
                    http_status=response.status_code,
                    retriable=retry_reads and transient,
                    uncertain=normalized_method != "GET" and not (400 <= response.status_code < 500),
                ) from exc

            if not isinstance(payload, dict):
                raise KieApiError(
                    "KIE provider returned an invalid response",
                    http_status=response.status_code,
                    uncertain=normalized_method != "GET" and not (400 <= response.status_code < 500),
                )

            code = payload.get("code")
            body_failed = code is not None and str(code) != "200"
            http_failed = response.status_code >= 400
            transient = _is_transient(code, response.status_code)
            if not body_failed and not http_failed:
                return payload

            # GET status/credit calls are safe to retry. For createTask, only
            # KIE's documented 429 rejection is safe to replay; a 5xx or
            # network timeout may have created a task already.
            safe_to_retry = retry_reads or str(code) == "429" or response.status_code == 429
            if safe_to_retry and transient and attempt < attempts - 1:
                await asyncio.sleep(KIE_RETRY_BACKOFF_SECONDS * (2**attempt))
                continue

            message = _provider_message(payload, f"KIE request failed ({code or response.status_code})")
            raise KieApiError(
                message,
                code=code,
                http_status=response.status_code,
                retriable=transient,
                uncertain=normalized_method != "GET" and _write_outcome_is_uncertain(code, response.status_code),
                payload=payload,
            )

    raise KieApiError("KIE provider request failed")


def _callback_url() -> str | None:
    token = settings.KIE_CALLBACK_TOKEN or settings.SUNO_CALLBACK_TOKEN
    if not settings.public_base_url or not token:
        return None
    query = urlencode({"token": token})
    return f"{settings.public_base_url}/api/v1/ai/kie/callback?{query}"


async def _create_task_request(
    path: str,
    payload: dict[str, Any],
    *,
    label: str,
    include_callback: bool = False,
) -> str:
    request_payload = dict(payload)
    if include_callback:
        callback_url = _callback_url()
        if callback_url:
            request_payload["callBackUrl"] = callback_url

    data = await _request_json(
        "POST",
        path,
        headers={
            "Authorization": f"Bearer {settings.KIE_API_KEY}",
            "Content-Type": "application/json",
        },
        json_payload=request_payload,
    )
    task_id = data.get("data", {}).get("taskId") if isinstance(data.get("data"), dict) else None
    if not task_id:
        # HTTP 200 without a task id is not a definite rejection: the
        # provider may have accepted the task but returned a malformed or
        # partial response. Keep the reservation until the outcome is
        # confirmed instead of refunding and risking a duplicate retry.
        raise KieApiError(f"{label} did not return a task id", uncertain=True, payload=data)
    return str(task_id)

SUNO_PREFIX = "suno/"
SUNO_CREATE_MODEL = "ai-music-api/generate"
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
GEMINI_TTS_MODELS = {
    "google/gemini-3-8-flash-tts",
    "google/gemini-3-1-flash-tts",
    "google/gemini-3-8-flash-lite-tts",
}
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


def normalize_gemini_tts_inputs(model: str, inputs: dict) -> dict:
    """Adapt the app's dialogue form to Gemini's speaker/turn contract."""
    normalized = dict(inputs or {})
    dialogue = normalized.get("dialogue")
    if not isinstance(dialogue, list):
        dialogue = []

    default_voices = (
        ("Fenrir", "Puck")
        if model == "google/gemini-3-1-flash-tts"
        else ("Fola", "Zephyr")
    )
    speakers: list[dict[str, str]] = []
    speaker_ids_by_voice: dict[str, str] = {}
    dialogue_turns: list[dict[str, str]] = []

    for item in dialogue[:100]:
        if not isinstance(item, dict):
            continue
        text = str(item.get("text") or "").strip()
        if not text:
            continue
        voice_key = str(item.get("voice") or "").strip().lower()
        if voice_key not in speaker_ids_by_voice:
            # Gemini TTS currently documents a two-speaker contract. Reuse
            # the second provider voice for additional UI voice labels rather
            # than sending an invalid third speaker definition.
            speaker_index = min(len(speaker_ids_by_voice), len(default_voices) - 1)
            speaker_id = f"Speaker {speaker_index + 1}"
            provider_voice = default_voices[speaker_index]
            speaker_ids_by_voice[voice_key] = speaker_id
            if not any(item["speaker_id"] == speaker_id for item in speakers):
                speakers.append({"speaker_id": speaker_id, "voice_name": provider_voice})
        speaker_id = speaker_ids_by_voice[voice_key]
        turn = {"speaker_id": speaker_id, "text": text}
        style = str(item.get("style") or "").strip()
        if style:
            turn["style"] = style[:1000]
        dialogue_turns.append(turn)

    return {
        "temperature": 1,
        "speakers": speakers,
        "dialogue_turns": dialogue_turns,
    }

def get_kie_remaining_credits_sync() -> int | None:
    if settings.KIE_API_KEY == "mock_key":
        return 9999
    if not settings.KIE_API_KEY:
        # Do not make a network request with an invalid `Bearer ` header when
        # provider access is intentionally disabled (for example on a fresh
        # production install). The admin dashboard can render the metric as
        # unavailable without producing noisy traceback logs.
        return None

    try:
        with httpx.Client(timeout=15) as client:
            response = client.get(
                f"{settings.KIE_API_URL}/api/v1/chat/credit",
                headers={"Authorization": f"Bearer {settings.KIE_API_KEY}"}
            )
            data = response.json()
            if isinstance(data, dict) and str(data.get("code")) == "200":
                value = data.get("data")
                if isinstance(value, dict):
                    value = value.get("credits") or value.get("remainingCredits") or value.get("balance")
                return int(value)
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

    if provider_model in GEMINI_TTS_MODELS:
        inputs = normalize_gemini_tts_inputs(provider_model, inputs)
        if not inputs["dialogue_turns"]:
            raise KieApiError("Gemini TTS requires at least one non-empty dialogue turn")

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

    headers = {
        "Authorization": f"Bearer {settings.KIE_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": provider_model,
        "input": inputs,
    }
    callback_url = _callback_url()
    if callback_url:
        payload["callBackUrl"] = callback_url

    logger.info("Requesting KIE generation for model: %s", provider_model)
    data = await _request_json(
        "POST",
        "/api/v1/jobs/createTask",
        headers=headers,
        json_payload=payload,
    )

    task_id = data.get("data", {}).get("taskId") if isinstance(data.get("data"), dict) else None
    if not task_id:
        raise KieApiError("KIE provider did not return a task id", uncertain=True, payload=data)

    return str(task_id)

async def _request_suno_generation(model: str, inputs: dict):
    """Create Suno tasks through KIE's current unified task API."""
    suno_model = model[len(SUNO_PREFIX):].upper()
    custom_mode = _coerce_bool(inputs.get("custom_mode", inputs.get("customMode")), False)
    task_input: dict[str, Any] = {
        "custom_mode": custom_mode,
        "instrumental": _coerce_bool(inputs.get("instrumental"), False),
        "model": suno_model,
    }
    prompt = str(inputs.get("prompt") or "").strip()
    style = str(inputs.get("style") or "").strip()
    title = str(inputs.get("title") or "").strip()
    if prompt:
        task_input["prompt"] = prompt[:5000 if custom_mode else 3000]
    if style:
        task_input["style"] = style[:1000]
    if custom_mode:
        task_input["title"] = (title or "AI Song")[:80]
    for source_key, target_key in (
        ("negative_tags", "negative_tags"),
        ("negativeTags", "negative_tags"),
        ("lyrics", "lyrics"),
        ("persona_id", "persona_id"),
        ("personaId", "persona_id"),
    ):
        value = str(inputs.get(source_key) or "").strip()
        if value and target_key not in task_input:
            task_input[target_key] = value[:5000 if target_key == "lyrics" else 1000]

    # The current non-custom contract does not accept the legacy duration
    # field. Preserve duration only for the V6 custom-mode variants.
    if custom_mode and suno_model in {"V6", "V6_MINI", "V6_WILD"}:
        duration = inputs.get("duration")
        if isinstance(duration, (int, float)) and not isinstance(duration, bool):
            task_input["duration"] = min(max(int(duration), 10), 360)

    logger.info("Requesting Suno generation, model: %s", suno_model)
    task_id = await _create_task_request(
        "/api/v1/jobs/createTask",
        {"model": SUNO_CREATE_MODEL, "input": task_input},
        label="Suno API",
        include_callback=True,
    )
    # Current Suno tasks use the same unified recordInfo endpoint as other
    # market models. Legacy `suno/<id>` task IDs remain supported below.
    return task_id

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

    task_id = await _create_task_request(
        "/api/v1/runway/generate",
        payload,
        label="Runway API",
    )
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

    task_id = await _create_task_request(
        "/api/v1/runway/extend",
        payload,
        label="Runway Extend API",
    )
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

    task_id = await _create_task_request(
        "/api/v1/aleph/generate",
        payload,
        label="Aleph API",
    )
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

    task_id = await _create_task_request(
        "/api/v1/flux/kontext/generate",
        payload,
        label="Flux Kontext API",
    )
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

    task_id = await _create_task_request(
        "/api/v1/veo/generate",
        payload,
        label="VEO API",
    )
    return f"{VEO_GENERATE_PREFIX}{task_id}"

async def _request_veo_extend(inputs: dict):
    payload = {
        "taskId": str(inputs.get("origin_task_id") or "").strip(),
        "prompt": str(inputs.get("prompt") or "").strip(),
        "model": "fast" if str(inputs.get("generation_mode") or "").strip() == "fast" else "quality",
        "enableFallback": bool(inputs.get("enable_fallback", False)),
    }
    payload = {key: value for key, value in payload.items() if value not in ("", None)}

    task_id = await _create_task_request(
        "/api/v1/veo/extend",
        payload,
        label="VEO Extend API",
    )
    return f"{VEO_EXTEND_PREFIX}{task_id}"

def _map_vendor_status(status: str | None):
    normalized = str(status or "").strip().lower()
    if normalized in {"success", "succeeded", "completed", "complete", "1", "true"}:
        return "success"
    if normalized in {"failed", "fail", "error", "cancelled", "canceled", "2", "3", "false"}:
        return "failed"
    return "processing"


def _extract_provider_error_message(data: dict | None, fallback: str) -> str:
    return _provider_message(data, fallback)


def _extract_result_url(value: Any) -> str | None:
    """Extract the first usable result URL from KIE's changing result shapes."""
    if isinstance(value, str):
        candidate = value.strip()
        if not candidate:
            return None
        if candidate.startswith("{") or candidate.startswith("["):
            try:
                return _extract_result_url(json.loads(candidate))
            except (TypeError, ValueError, json.JSONDecodeError):
                return None
        return candidate
    if isinstance(value, list):
        for item in value:
            result = _extract_result_url(item)
            if result:
                return result
        return None
    if not isinstance(value, dict):
        return None

    for key in (
        "resultUrls",
        "result_urls",
        "url",
        "result_url",
        "resultUrl",
        "videoUrl",
        "video_url",
        "audioUrl",
        "audio_url",
        "imageUrl",
        "image_url",
        "resultVideoUrl",
        "resultImageUrl",
        "data",
        "result",
        "output",
        "images",
        "videos",
        "audios",
        "sunoData",
        "resultJson",
        "response",
        "info",
    ):
        result = _extract_result_url(value.get(key))
        if result:
            return result
    return None


def _build_status_result(
    *,
    status: str,
    output_url: str | None,
    provider_status: Any,
    raw_response: dict[str, Any],
    error_message: str | None,
) -> dict[str, Any]:
    # A provider sometimes reports success before attaching the result. Do
    # not leave the user charged for a task that cannot produce a usable file.
    if status == "success" and not output_url:
        status = "failed"
        error_message = "Provider reported success without a result"
    return {
        "status": status,
        "output_url": output_url,
        "provider_status": provider_status,
        "raw_response": raw_response,
        "error_message": error_message if status == "failed" else None,
    }


def normalize_kie_task_response(
    payload: dict[str, Any],
    *,
    strict: bool = True,
) -> dict[str, Any]:
    """Normalize generic KIE task responses and callbacks to one contract."""
    if not isinstance(payload, dict):
        raise KieApiError("KIE provider returned an invalid task response")

    code = payload.get("code")
    if strict and code is not None and str(code) != "200":
        raise KieApiError(
            _provider_message(payload, f"KIE task request failed ({code})"),
            code=code,
            payload=payload,
        )

    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    provider_status = data.get("state") or data.get("status") or data.get("successFlag")
    normalized_status = _map_vendor_status(str(provider_status) if provider_status is not None else None)

    # Some callbacks provide resultJson as a JSON string, while newer
    # endpoints put the same object under info/response directly.
    output_url = _extract_result_url(data)
    # Some KIE-compatible endpoints omit a state in their final response and
    # return only the output object. A usable result is definitive evidence of
    # completion; without it, keep the task in processing instead of charging
    # a task that has no downloadable result.
    if provider_status is None and output_url:
        normalized_status = "success"
    error_message = _provider_message(data, f"KIE returned status {provider_status}")
    if normalized_status != "failed":
        error_message = None
    return _build_status_result(
        status=normalized_status,
        output_url=output_url,
        provider_status=provider_status,
        raw_response=data,
        error_message=error_message,
    )

async def _check_runway_status(raw_task_id: str):
    data = await _request_json(
        "GET",
        "/api/v1/runway/record-detail",
        headers={"Authorization": f"Bearer {settings.KIE_API_KEY}"},
        params={"taskId": raw_task_id},
        retry_reads=True,
    )
    body = data.get("data") if isinstance(data.get("data"), dict) else {}
    provider_status = body.get("state") or body.get("status")
    output_url = _extract_result_url(body.get("videoInfo") or body)
    internal_status = _map_vendor_status(provider_status)
    return _build_status_result(
        status=internal_status,
        output_url=output_url,
        provider_status=provider_status,
        raw_response=body,
        error_message=None if internal_status != "failed" else _extract_provider_error_message(
            body,
            f"Runway returned status {provider_status}",
        ),
    )

async def _check_aleph_status(raw_task_id: str):
    headers = {"Authorization": f"Bearer {settings.KIE_API_KEY}"}
    response = await _request_json(
        "GET",
        "/api/v1/aleph/record-info",
        headers=headers,
        params={"taskId": raw_task_id},
        retry_reads=True,
    )
    data = response.get("data") if isinstance(response.get("data"), dict) else {}

    if "successFlag" in data:
        success_flag = data.get("successFlag")
        if success_flag == 1:
            internal_status = "success"
        elif success_flag in {2, 3} or (success_flag == 0 and _provider_message(data, "")):
            internal_status = "failed"
        else:
            internal_status = "processing"
        return _build_status_result(
            status=internal_status,
            output_url=_extract_result_url(data),
            provider_status=str(success_flag),
            raw_response=data,
            error_message=None if internal_status != "failed" else _extract_provider_error_message(
                data,
                f"Aleph returned successFlag {success_flag}",
            ),
        )

    # Backward-compatible fallback for older payload shapes.
    response = await _request_json(
        "GET",
        "/api/v1/aleph/record-detail",
        headers=headers,
        params={"taskId": raw_task_id},
        retry_reads=True,
    )
    data = response.get("data") if isinstance(response.get("data"), dict) else {}
    provider_status = data.get("state") or data.get("status")
    internal_status = _map_vendor_status(provider_status)
    return _build_status_result(
        status=internal_status,
        output_url=_extract_result_url(data),
        provider_status=provider_status,
        raw_response=data,
        error_message=None if internal_status != "failed" else _extract_provider_error_message(
            data,
            f"Aleph returned status {provider_status}",
        ),
    )

async def _check_flux_kontext_status(raw_task_id: str):
    response = await _request_json(
        "GET",
        "/api/v1/flux/kontext/record-info",
        headers={"Authorization": f"Bearer {settings.KIE_API_KEY}"},
        params={"taskId": raw_task_id},
        retry_reads=True,
    )
    data = response.get("data") if isinstance(response.get("data"), dict) else {}
    success_flag = data.get("successFlag")
    if success_flag == 1:
        internal_status = "success"
    elif success_flag in {2, 3}:
        internal_status = "failed"
    else:
        internal_status = "processing"
    return _build_status_result(
        status=internal_status,
        output_url=_extract_result_url(data),
        provider_status=str(success_flag),
        raw_response=data,
        error_message=None if internal_status != "failed" else _extract_provider_error_message(
            data,
            f"Flux Kontext returned successFlag {success_flag}",
        ),
    )

async def _check_veo_status(raw_task_id: str):
    response = await _request_json(
        "GET",
        "/api/v1/veo/record-info",
        headers={"Authorization": f"Bearer {settings.KIE_API_KEY}"},
        params={"taskId": raw_task_id},
        retry_reads=True,
    )
    data = response.get("data") if isinstance(response.get("data"), dict) else {}
    success_flag = data.get("successFlag")
    if success_flag == 1:
        internal_status = "success"
    elif success_flag in {2, 3}:
        internal_status = "failed"
    else:
        internal_status = "processing"
    return _build_status_result(
        status=internal_status,
        output_url=_extract_result_url(data),
        provider_status=str(success_flag),
        raw_response=data,
        error_message=None if internal_status != "failed" else _extract_provider_error_message(
            data,
            f"VEO returned successFlag {success_flag}",
        ),
    )

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

    response = await _request_json(
        "GET",
        "/api/v1/jobs/recordInfo",
        headers={"Authorization": f"Bearer {settings.KIE_API_KEY}"},
        params={"taskId": task_id},
        retry_reads=True,
    )
    return normalize_kie_task_response(response)

async def _check_suno_status(raw_task_id: str):
    """Check status for Suno music generation tasks."""
    response = await _request_json(
        "GET",
        "/api/v1/generate/record-info",
        headers={"Authorization": f"Bearer {settings.KIE_API_KEY}"},
        params={"taskId": raw_task_id},
        retry_reads=True,
    )
    data = response.get("data") if isinstance(response.get("data"), dict) else {}
    status = str(data.get("status") or "")
    failed_states = {
        "CREATE_TASK_FAILED",
        "GENERATE_AUDIO_FAILED",
        "CALLBACK_EXCEPTION",
        "SENSITIVE_WORD_ERROR",
        "FAILED",
        "ERROR",
    }
    if status == "SUCCESS":
        internal_status = "success"
    elif status in failed_states:
        internal_status = "failed"
    else:
        internal_status = "processing"
    return _build_status_result(
        status=internal_status,
        output_url=_extract_result_url(data),
        provider_status=status,
        raw_response=data,
        error_message=None if internal_status != "failed" else _extract_provider_error_message(
            data,
            f"Suno returned status {status}",
        ),
    )

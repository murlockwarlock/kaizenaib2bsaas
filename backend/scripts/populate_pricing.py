import sys

sys.path.append("/home/user/.gemini/antigravity/scratch/ai_editor_mvp/backend")

from core.database import SessionLocal
from models.admin import ModelPricing
from models.task import Task  # Ensure models are registered

KIE_PRICE_MULTIPLIER = 2.5


def scaled_cost(kie_credits: float) -> float:
    return round(float(kie_credits) * KIE_PRICE_MULTIPLIER, 2)


def make_entry(category: str, model_name: str, kie_credits: float, **filters):
    payload = {
        "category": category,
        "model_name": model_name,
        "cost": scaled_cost(kie_credits),
        "is_active": True,
    }
    payload.update(filters)
    return payload


def build_price_entries():
    entries: list[dict] = []

    def add(category: str, model_name: str, kie_credits: float, **filters):
        entries.append(make_entry(category, model_name, kie_credits, **filters))

    # Exact KIE image pricing.
    for model_name in ("flux-2/pro-text-to-image", "flux-2/pro-image-to-image"):
        add("image", model_name, 5, resolution="1K")
        add("image", model_name, 7, resolution="2K")

    for model_name in ("flux-2/flex-text-to-image", "flux-2/flex-image-to-image"):
        add("image", model_name, 14, resolution="1K")
        add("image", model_name, 24, resolution="2K")

    add("image", "flux-kontext-pro", 5)
    add("image", "google/nano-banana", 4)
    add("image", "google/nano-banana-edit", 4)

    for resolution, kie_credits in (("1K", 8), ("2K", 12), ("4K", 18)):
        add("image", "nano-banana-2", kie_credits, resolution=resolution)

    for resolution, kie_credits in (("1K", 18), ("2K", 18), ("4K", 24)):
        add("image", "nano-banana-pro", kie_credits, resolution=resolution)

    add("image", "google/imagen4", 8)
    add("image", "google/imagen4-ultra", 12)
    for num_images, kie_credits in ((1, 4), (2, 8), (3, 12), (4, 16)):
        add("image", "google/imagen4-fast", kie_credits, num_images=num_images)

    add("image", "qwen/text-to-image", 4)
    add("image", "qwen/image-to-image", 4)
    add("image", "z-image", 0.8)
    add("image", "recraft/remove-background", 1)
    add("image", "recraft/crisp-upscale", 0.5)
    add("image", "topaz/image-upscale", 20)

    # KIE has Ideogram quality tiers, but the current client exposes a single default path.
    add("image", "ideogram/v3-text-to-image", 7)
    add("image", "ideogram/character", 18)

    # Seedream image models are present in the app, but KIE public pricing currently exposes only
    # Seedream 5.0 Lite base pricing. Reuse that baseline until KIE publishes dedicated rows.
    for model_name in (
        "bytedance/seedream",
        "bytedance/seedream-v4-text-to-image",
        "bytedance/seedream-v4-edit",
        "seedream/4.5-text-to-image",
    ):
        add("image", model_name, 5.5)

    # Exact KIE video pricing.
    for model_name in ("kling-2.6/text-to-video", "kling-2.6/image-to-video"):
        for duration, sound_enabled, kie_credits in (
            (5, False, 55),
            (5, True, 110),
            (10, False, 110),
            (10, True, 220),
        ):
            add("video", model_name, kie_credits, duration=duration, sound_enabled=sound_enabled)

    for duration, kie_credits in ((5, 160), (10, 320)):
        add("video", "kling/v2-1-master-image-to-video", kie_credits, duration=duration)

    for duration, kie_credits in ((5, 42), (10, 84)):
        add("video", "kling/v2-5-turbo-text-to-video-pro", kie_credits, duration=duration)

    add("video", "kling/ai-avatar-standard", 8)
    add("video", "kling/ai-avatar-pro", 16)
    add("video", "kling-3/motion-control", 6, generation_mode="720p")
    add("video", "kling-3/motion-control", 9, generation_mode="1080p")

    for duration in range(3, 16):
        add("video", "kling-3.0/video", 20 * duration, duration=duration, generation_mode="std", sound_enabled=False)
        add("video", "kling-3.0/video", 30 * duration, duration=duration, generation_mode="std", sound_enabled=True)
        add("video", "kling-3.0/video", 27 * duration, duration=duration, generation_mode="pro", sound_enabled=False)
        add("video", "kling-3.0/video", 40 * duration, duration=duration, generation_mode="pro", sound_enabled=True)

    for model_name in ("veo-3.1/text-fast", "veo-3.1/image-fast"):
        add("video", model_name, 60, duration=5, aspect_ratio="16:9")
        add("video", model_name, 60, duration=5, aspect_ratio="9:16")
        add("video", model_name, 60, duration=8, aspect_ratio="16:9")
        add("video", model_name, 60, duration=8, aspect_ratio="9:16")

    for model_name in ("veo-3.1/text-quality", "veo-3.1/image-quality"):
        add("video", model_name, 250, duration=5, aspect_ratio="16:9")
        add("video", model_name, 250, duration=5, aspect_ratio="9:16")
        add("video", model_name, 250, duration=8, aspect_ratio="16:9")
        add("video", model_name, 250, duration=8, aspect_ratio="9:16")

    add("video", "veo-3.1/reference-fast", 60, duration=8, aspect_ratio="16:9")
    add("video", "veo-3.1/extend-fast", 60, generation_mode="fast")
    add("video", "veo-3.1/extend-quality", 250, generation_mode="quality")
    add("video", "veo-3.1/get-1080p", 5)
    add("video", "veo-3.1/get-4k", 120)

    for model_name in ("sora-2-text-to-video", "sora-2-image-to-video"):
        add("video", model_name, 30, frame_count=10)
        add("video", model_name, 35, frame_count=15)

    for model_name in ("sora-2-pro-text-to-video", "sora-2-pro-image-to-video"):
        for generation_mode, frame_count, kie_credits in (
            ("standard", 10, 150),
            ("standard", 15, 270),
            ("high", 10, 330),
            ("high", 15, 630),
        ):
            add("video", model_name, kie_credits, generation_mode=generation_mode, frame_count=frame_count)

    add("video", "sora-2-pro-storyboard", 150, frame_count=10)
    add("video", "sora-2-pro-storyboard", 270, frame_count=15)
    add("video", "sora-2-pro-storyboard", 270, frame_count=25)
    add("video", "sora-watermark-remover", 10)

    add("video", "hailuo/2-3-image-to-video-pro", 45, duration=6, resolution="768P")
    add("video", "hailuo/2-3-image-to-video-standard", 30, duration=6, resolution="768P")
    add("video", "hailuo/02-text-to-video-pro", 57)
    add("video", "hailuo/02-image-to-video-pro", 57)
    add("video", "hailuo/02-text-to-video-standard", 30, duration=6)
    add("video", "hailuo/02-image-to-video-standard", 50, duration=10, resolution="768P")

    for model_name in ("wan/2-6-text-to-video", "wan/2-6-image-to-video", "wan/2-6-video-to-video"):
        add("video", model_name, 70, duration=5, resolution="720p")
        add("video", model_name, 104.5, duration=5, resolution="1080p")

    add("video", "wan/2-2-a14b-text-to-video-turbo", 80, resolution="720p")
    add("video", "wan/2-2-a14b-image-to-video-turbo", 80, resolution="720p")
    add("video", "wan/2-2-a14b-speech-to-video-turbo", 12, resolution="480p")
    add("video", "wan/2-2-animate-move", 6, resolution="480p")
    add("video", "wan/2-2-animate-replace", 6, resolution="480p")

    add("video", "runway/generate", 12, duration=5, resolution="720p")
    add("video", "runway/generate", 30, duration=10, resolution="720p")
    add("video", "runway/generate", 30, duration=5, resolution="1080p")
    add("video", "runway/aleph-generate", 110)

    # Models currently available in the app but missing dedicated public KIE pricing rows.
    # These are seeded from the nearest published KIE equivalents so pricing stays usable.
    for resolution, kie_credits in (("720p", 12), ("1080p", 30)):
        add("video", "runway/extend", kie_credits, resolution=resolution)

    for model_name in ("wan/2-6-flash-image-to-video", "wan/2-6-flash-video-to-video"):
        add("video", model_name, 70, duration=5, resolution="720p")
        add("video", model_name, 104.5, duration=5, resolution="1080p")

    # ByteDance video rows are not exposed on the public KIE pricing page at the moment.
    # Use Runway-like baselines for equivalent 5/10s 720p/1080p flows until KIE publishes them.
    add("video", "bytedance/v1-pro-fast-image-to-video", 12, duration=5, resolution="720p")
    for model_name in ("bytedance/v1-pro-image-to-video", "bytedance/v1-pro-text-to-video"):
        add("video", model_name, 12, duration=5, resolution="720p")
        add("video", model_name, 30, duration=10, resolution="720p")
        add("video", model_name, 30, duration=5, resolution="1080p")
        add("video", model_name, 60, duration=10, resolution="1080p")

    add("video", "bytedance/v1-lite-image-to-video", 12, duration=5, resolution="720p")
    add("video", "bytedance/v1-lite-text-to-video", 12, duration=5, resolution="720p")
    add("video", "bytedance/seedance-1-5-pro", 20, duration=8, resolution="720p")
    add("video", "bytedance/seedance-1-5-pro", 30, duration=10, resolution="720p")
    add("video", "bytedance/seedance-1-5-pro", 48, duration=8, resolution="1080p")
    add("video", "bytedance/seedance-1-5-pro", 60, duration=10, resolution="1080p")

    # Sora utility workflows without public KIE rows yet.
    add("video", "sora-2-characters", 10)
    add("video", "sora-2-characters-pro", 10)

    # Exact KIE audio pricing where available.
    add("audio", "elevenlabs/text-to-speech-turbo-2-5", 6)
    add("audio", "elevenlabs/text-to-speech-multilingual-v2", 12)
    add("audio", "elevenlabs/text-to-dialogue-v3", 14)

    # Suno pricing is published as operation pricing rather than model-version pricing.
    # The app exposes model versions as one generation action, so use the same KIE base.
    for model_name in ("suno/V5", "suno/V4_5PLUS", "suno/V4_5", "suno/V4"):
        add("audio", model_name, 12)

    return entries


def populate():
    db = SessionLocal()
    entries = build_price_entries()
    try:
        db.query(ModelPricing).delete()
        for entry in entries:
            db.add(ModelPricing(**entry))
        db.commit()
        print(f"Successfully populated {len(entries)} pricing rows with KIE x{KIE_PRICE_MULTIPLIER} costs.")
    except Exception as exc:
        db.rollback()
        print(f"Error: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    populate()

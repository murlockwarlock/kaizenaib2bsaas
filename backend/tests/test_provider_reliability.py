import asyncio
from unittest.mock import patch


class TestGenerationReconciliation:
    def test_periodic_reconciliation_refunds_provider_failure_once(self, db_session, test_user):
        from models.task import Task
        from models.user import User
        from services.tasks import reconcile_generation_tasks
        from conftest import TestingSessionLocal

        user = db_session.query(User).filter(User.email == "test@example.com").first()
        user.balance = 10
        task = Task(
            user_id=user.id,
            task_id_vendor="veo/vendor-reconciliation-1",
            tool_type="general",
            category="video",
            model="veo-3-1",
            status="processing",
            provider_status="queued",
            cost=3,
        )
        db_session.add(task)
        db_session.commit()

        async def failed_status(_task_id):
            return {
                "status": "failed",
                "provider_status": "FAILED",
                "error_message": "Provider rejected the generation",
                "raw_response": {"state": "failed"},
            }

        # The reconciliation task uses its own session in production. Reusing
        # the fixture session here keeps the test database isolated from the
        # application's local SQLite file.
        worker_db = TestingSessionLocal()
        with patch("services.tasks.SessionLocal", return_value=worker_db), patch(
            "services.tasks.check_task_status", new=failed_status
        ):
            assert reconcile_generation_tasks.run(limit=10) == 1

        db_session.expire_all()
        db_session.refresh(user)
        db_session.refresh(task)
        assert task.status == "failed"
        assert task.credits_refunded_at is not None
        assert user.balance == 13

        # A completed task is not selected again, and the refund guard is also
        # idempotent if another failure path sees the same row.
        worker_db = TestingSessionLocal()
        with patch("services.tasks.SessionLocal", return_value=worker_db), patch(
            "services.tasks.check_task_status", new=failed_status
        ):
            assert reconcile_generation_tasks.run(limit=10) == 0
        db_session.expire_all()
        db_session.refresh(user)
        assert user.balance == 13

import pytest


class FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code
        self.text = str(payload)

    def json(self):
        return self._payload


class FakeAsyncClient:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def request(self, method, url, **kwargs):
        self.calls.append((method, url, kwargs))
        return self.responses.pop(0)


def test_kie_quota_check_skips_network_when_provider_key_is_missing(monkeypatch):
    from services import kie_ai

    monkeypatch.setattr(kie_ai.settings, "KIE_API_KEY", "")

    assert kie_ai.get_kie_remaining_credits_sync() is None


def test_kie_body_level_error_is_not_treated_as_success(monkeypatch):
    from services import kie_ai

    fake = FakeAsyncClient([
        FakeResponse({"code": 401, "msg": "Invalid KIE key"}),
    ])
    monkeypatch.setattr(kie_ai.httpx, "AsyncClient", lambda **kwargs: fake)
    monkeypatch.setattr(kie_ai.settings, "KIE_API_KEY", "real-test-key")

    with pytest.raises(kie_ai.KieApiError) as error:
        asyncio.run(kie_ai.request_kie_generation("flux-2/pro-text-to-image", {"prompt": "test"}))

    assert error.value.code == 401
    assert "Invalid KIE key" in str(error.value)
    assert error.value.uncertain is False


def test_kie_body_level_server_error_is_uncertain_for_create(monkeypatch):
    from services import kie_ai

    fake = FakeAsyncClient([
        FakeResponse({"code": 500, "msg": "Provider unavailable"}),
    ])
    monkeypatch.setattr(kie_ai.httpx, "AsyncClient", lambda **kwargs: fake)
    monkeypatch.setattr(kie_ai.settings, "KIE_API_KEY", "real-test-key")

    with pytest.raises(kie_ai.KieApiError) as error:
        asyncio.run(kie_ai.request_kie_generation("flux-2/pro-text-to-image", {"prompt": "test"}))

    assert error.value.retriable is True
    assert error.value.uncertain is True


def test_kie_status_retries_rate_limit_and_normalizes_result(monkeypatch):
    from services import kie_ai

    retry_responses = [
        FakeResponse({"code": 429, "msg": "Too many requests"}),
        FakeResponse({"code": 200, "data": {"state": "success", "resultJson": '{"resultUrls":["https://cdn.example/result.png"]}'}}),
    ]
    fake = FakeAsyncClient(retry_responses)
    monkeypatch.setattr(kie_ai.httpx, "AsyncClient", lambda **kwargs: fake)
    monkeypatch.setattr(kie_ai, "KIE_RETRY_BACKOFF_SECONDS", 0)
    monkeypatch.setattr(kie_ai.settings, "KIE_API_KEY", "real-test-key")

    result = asyncio.run(kie_ai.check_task_status("vendor-task"))

    assert result["status"] == "success"
    assert result["output_url"] == "https://cdn.example/result.png"
    assert len(fake.calls) == 2


def test_kie_create_retries_only_a_rejected_rate_limit(monkeypatch):
    from services import kie_ai

    fake = FakeAsyncClient([
        FakeResponse({"code": 429, "msg": "Too many requests"}),
        FakeResponse({"code": 200, "data": {"taskId": "accepted-task"}}),
    ])
    monkeypatch.setattr(kie_ai.httpx, "AsyncClient", lambda **kwargs: fake)
    monkeypatch.setattr(kie_ai, "KIE_RETRY_BACKOFF_SECONDS", 0)
    monkeypatch.setattr(kie_ai.settings, "KIE_API_KEY", "real-test-key")

    task_id = asyncio.run(kie_ai.request_kie_generation("flux-2/pro-text-to-image", {"prompt": "test"}))

    assert task_id == "accepted-task"
    assert len(fake.calls) == 2


def test_kie_create_without_task_id_is_uncertain(monkeypatch):
    from services import kie_ai

    fake = FakeAsyncClient([
        FakeResponse({"code": 200, "data": {}}),
    ])
    monkeypatch.setattr(kie_ai.httpx, "AsyncClient", lambda **kwargs: fake)
    monkeypatch.setattr(kie_ai.settings, "KIE_API_KEY", "real-test-key")

    with pytest.raises(kie_ai.KieApiError) as error:
        asyncio.run(kie_ai.request_kie_generation("flux-2/pro-text-to-image", {"prompt": "test"}))

    assert error.value.uncertain is True


def test_kie_result_shapes_normalize_to_success():
    from services.kie_ai import normalize_kie_task_response

    assert normalize_kie_task_response({
        "code": 200,
        "data": {"successFlag": 1, "result": {"video_url": "https://cdn.example/video.mp4"}},
    })["status"] == "success"
    assert normalize_kie_task_response({
        "code": 200,
        "data": {"output": {"resultUrl": "https://cdn.example/result.png"}},
    }) == {
        "status": "success",
        "output_url": "https://cdn.example/result.png",
        "provider_status": None,
        "raw_response": {"output": {"resultUrl": "https://cdn.example/result.png"}},
        "error_message": None,
    }


def test_current_suno_uses_unified_v6_task_contract(monkeypatch):
    from services import kie_ai

    fake = FakeAsyncClient([
        FakeResponse({"code": 200, "data": {"taskId": "suno-current"}}),
    ])
    monkeypatch.setattr(kie_ai.httpx, "AsyncClient", lambda **kwargs: fake)
    monkeypatch.setattr(kie_ai.settings, "KIE_API_KEY", "real-test-key")

    task_id = asyncio.run(kie_ai.request_kie_generation(
        "suno/V6",
        {
            "prompt": "A calm synthwave track",
            "style": "synthwave",
            "custom_mode": "false",
            "duration": 120,
        },
    ))

    assert task_id == "suno-current"
    method, url, kwargs = fake.calls[0]
    assert method == "POST"
    assert url.endswith("/api/v1/jobs/createTask")
    payload = kwargs["json"]
    assert payload["model"] == "ai-music-api/generate"
    assert payload["input"]["model"] == "V6"
    assert payload["input"]["custom_mode"] is False
    assert "duration" not in payload["input"]


def test_gemini_tts_maps_extra_ui_voices_to_supported_two_speaker_contract():
    from services import kie_ai

    normalized = kie_ai.normalize_gemini_tts_inputs(
        "google/gemini-3-8-flash-tts",
        {
            "dialogue": [
                {"voice": "Roger", "text": "Hello"},
                {"voice": "Sarah", "text": "Hi"},
                {"voice": "Lily", "text": "A third line"},
            ],
        },
    )

    assert normalized["speakers"] == [
        {"speaker_id": "Speaker 1", "voice_name": "Fola"},
        {"speaker_id": "Speaker 2", "voice_name": "Zephyr"},
    ]
    assert [turn["speaker_id"] for turn in normalized["dialogue_turns"]] == [
        "Speaker 1",
        "Speaker 2",
        "Speaker 2",
    ]


def test_current_video_payloads_normalize_provider_specific_inputs():
    from api.generation import (
        BYTEDANCE_SEEDANCE_20_MODEL,
        KLING_40_REFERENCE_MODEL,
        VEO_31_UNIFIED_MODEL,
        GROK_IMAGINE_VIDEO_15_MODEL,
        PIXVERSE_V6_MAX_IMAGE_MODEL,
        WAN_27_REFERENCE_MODEL,
        _normalize_video_inputs,
    )
    from api.schemas import GenerateRequest

    seedance = _normalize_video_inputs(
        BYTEDANCE_SEEDANCE_20_MODEL,
        {
            "prompt": "A paper boat",
            "first_frame_url": ["https://cdn.example/first.png"],
            "reference_image_urls": ["https://cdn.example/ref.png"],
            "duration": 5,
        },
        GenerateRequest(category="video", model=BYTEDANCE_SEEDANCE_20_MODEL),
    )
    assert seedance["first_frame_url"] == "https://cdn.example/first.png"
    assert "reference_image_urls" not in seedance

    kling = _normalize_video_inputs(
        KLING_40_REFERENCE_MODEL,
        {"prompt": "A character walks", "aspect_ratio": "9:16"},
        GenerateRequest(category="video", model=KLING_40_REFERENCE_MODEL),
    )
    assert kling["aspect_ratio"] == "9:16"

    wan = _normalize_video_inputs(
        WAN_27_REFERENCE_MODEL,
        {
            "prompt": "A cinematic portrait",
            "reference_image": ["https://cdn.example/ref.png"],
            "reference_voice": ["https://cdn.example/voice.wav"],
        },
        GenerateRequest(category="video", model=WAN_27_REFERENCE_MODEL),
    )
    assert wan["reference_image"] == ["https://cdn.example/ref.png"]
    assert wan["reference_voice"] == "https://cdn.example/voice.wav"

    veo = _normalize_video_inputs(
        VEO_31_UNIFIED_MODEL,
        {"prompt": "A sunrise", "resolution": "4k", "duration": 6, "aspect_ratio": "9:16"},
        GenerateRequest(category="video", model=VEO_31_UNIFIED_MODEL),
    )
    assert veo["resolution"] == "4k"
    assert veo["duration"] == 6
    assert veo["generation_type"] == "TEXT_2_VIDEO"

    grok = _normalize_video_inputs(
        GROK_IMAGINE_VIDEO_15_MODEL,
        {"prompt": "A cat", "generate_audio": False},
        GenerateRequest(category="video", model=GROK_IMAGINE_VIDEO_15_MODEL),
    )
    assert "generate_audio" not in grok
    assert "enable_audio" not in grok

    kling_4k = _normalize_video_inputs(
        "kling-3.0/video",
        {"prompt": "A stage performance", "mode": "4k", "duration": 5},
        GenerateRequest(category="video", model="kling-3.0/video"),
    )
    assert kling_4k["mode"] == "4K"

    pixverse = _normalize_video_inputs(
        PIXVERSE_V6_MAX_IMAGE_MODEL,
        {
            "prompt": "A product reveal",
            "image_urls": ["https://cdn.example/product.png"],
            "resolution": "1080p",
            "duration": 15,
            "generate_audio": True,
            "seed": "2147483648",
        },
        GenerateRequest(category="video", model=PIXVERSE_V6_MAX_IMAGE_MODEL),
    )
    assert pixverse["quality"] == "1080p"
    assert pixverse["duration"] == 15
    assert pixverse["generate_audio_switch"] is True
    assert pixverse["seed"] == 2_147_483_647
    assert "aspect_ratio" not in pixverse


def test_refund_is_idempotent(db_session):
    from models.task import Task
    from models.user import User
    from services.generation_refunds import refund_task_credits_once

    user = User(
        email="refund@example.com",
        hashed_password="not-used",
        balance=10,
        is_verified=True,
    )
    db_session.add(user)
    db_session.flush()
    task = Task(
        user_id=user.id,
        status="failed",
        category="image",
        tool_type="general",
        cost=3,
    )
    db_session.add(task)
    db_session.commit()

    assert refund_task_credits_once(db_session, task, reason="test") is True
    db_session.commit()
    assert refund_task_credits_once(db_session, task, reason="duplicate") is False
    db_session.commit()

    db_session.refresh(user)
    db_session.refresh(task)
    assert user.balance == 13
    assert task.credits_refunded_at is not None


def test_worker_refunds_definite_provider_failure(db_session):
    from models.task import Task
    from models.user import User
    from services.tasks import generate_kie_task
    from conftest import TestingSessionLocal

    user = User(
        email="worker-failure@example.com",
        hashed_password="not-used",
        balance=7,
        is_verified=True,
    )
    db_session.add(user)
    db_session.flush()
    task = Task(
        user_id=user.id,
        status="pending",
        category="image",
        tool_type="general",
        cost=3,
    )
    db_session.add(task)
    db_session.commit()

    with patch("services.tasks.SessionLocal", TestingSessionLocal), patch(
        "services.tasks.request_kie_generation",
        side_effect=ValueError("provider rejected task"),
    ):
        generate_kie_task.run(task.id, "test-model", {"prompt": "test"})

    db_session.refresh(user)
    db_session.refresh(task)
    assert task.status == "failed"
    assert task.credits_refunded_at is not None
    assert user.balance == 10


def test_worker_refunds_body_level_client_error(db_session):
    from models.task import Task
    from models.user import User
    from services.kie_ai import KieApiError
    from services.tasks import generate_kie_task
    from conftest import TestingSessionLocal

    user = User(
        email="worker-body-error@example.com",
        hashed_password="not-used",
        balance=7,
        is_verified=True,
    )
    db_session.add(user)
    db_session.flush()
    task = Task(
        user_id=user.id,
        status="pending",
        category="image",
        tool_type="general",
        cost=3,
    )
    db_session.add(task)
    db_session.commit()

    error = KieApiError("Invalid KIE key", code=401, http_status=200, uncertain=False)
    with patch("services.tasks.SessionLocal", TestingSessionLocal), patch(
        "services.tasks.request_kie_generation",
        side_effect=error,
    ):
        generate_kie_task.run(task.id, "test-model", {"prompt": "test"})

    db_session.refresh(user)
    db_session.refresh(task)
    assert task.status == "failed"
    assert task.provider_status == "request_failed"
    assert task.credits_refunded_at is not None
    assert user.balance == 10


def test_worker_keeps_balance_reserved_when_provider_outcome_is_unknown(db_session):
    from models.task import Task
    from models.user import User
    from services.kie_ai import KieApiError
    from services.tasks import generate_kie_task
    from conftest import TestingSessionLocal

    user = User(
        email="worker-unknown@example.com",
        hashed_password="not-used",
        balance=7,
        is_verified=True,
    )
    db_session.add(user)
    db_session.flush()
    task = Task(
        user_id=user.id,
        status="pending",
        category="image",
        tool_type="general",
        cost=3,
    )
    db_session.add(task)
    db_session.commit()

    error = KieApiError("provider timeout", uncertain=True)
    with patch("services.tasks.SessionLocal", TestingSessionLocal), patch(
        "services.tasks.request_kie_generation",
        side_effect=error,
    ):
        generate_kie_task.run(task.id, "test-model", {"prompt": "test"})

    db_session.refresh(user)
    db_session.refresh(task)
    assert task.status == "submission_unknown"
    assert task.provider_status == "provider_confirmation_pending"
    assert task.credits_refunded_at is None
    assert user.balance == 7


def test_status_poll_provider_error_is_visible_without_refunding(db_session):
    from models.task import Task
    from models.user import User
    from services.kie_ai import KieApiError
    from api.generation import get_task_status

    user = User(
        email="status-error@example.com",
        hashed_password="not-used",
        balance=7,
        is_verified=True,
    )
    db_session.add(user)
    db_session.flush()
    task = Task(
        user_id=user.id,
        task_id_vendor="vendor-status-error",
        status="processing",
        category="image",
        tool_type="general",
        cost=3,
    )
    db_session.add(task)
    db_session.commit()

    with patch(
        "api.generation.check_task_status",
        side_effect=KieApiError("provider unavailable", retriable=True),
    ):
        result = asyncio.run(get_task_status(task.id, db_session, user))

    db_session.refresh(task)
    db_session.refresh(user)
    assert result["status"] == "processing"
    assert result["provider_status"] == "provider_status_unavailable"
    assert "Credits remain reserved" in result["error_message"]
    assert task.credits_refunded_at is None
    assert user.balance == 7

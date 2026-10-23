from unittest.mock import patch


PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n"
    b"\x00\x00\x00\rIHDR"
    b"\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00"
    b"\x90wS\xde"
    b"\x00\x00\x00\x0cIDATx\x9cc``\x00\x00\x00\x02\x00\x01"
    b"\xe2!\xbc3"
    b"\x00\x00\x00\x00IEND\xaeB`\x82"
)


class TestSecurityHardening:
    def test_register_rejects_weak_password(self, client):
        with patch('api.auth.redis_client'):
            response = client.post("/api/v1/auth/register", json={
                "email": "weak@example.com",
                "password": "1234567",
            })

        assert response.status_code == 422

    def test_upload_rejects_svg(self, client, auth_headers):
        response = client.post(
            "/api/v1/files/upload",
            files={"file": ("payload.svg", b"<svg xmlns='http://www.w3.org/2000/svg'></svg>", "image/svg+xml")},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Unsupported image type" in response.json()["detail"]

    def test_upload_returns_relative_safe_url(self, client, auth_headers):
        response = client.post(
            "/api/v1/files/upload",
            files={"file": ("avatar.png", PNG_BYTES, "image/png")},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert response.json()["url"].startswith("/uploads/")

    def test_admin_promotions_requires_auth(self, client):
        response = client.get("/api/v1/admin/promotions")
        assert response.status_code == 401

    def test_suno_callback_requires_valid_token(self, client, db_session):
        from models.task import Task

        task = Task(user_id=1, task_id_vendor="suno/vendor-task", status="processing", category="audio", tool_type="general")
        db_session.add(task)
        db_session.commit()

        with patch('api.generation.settings.SUNO_CALLBACK_TOKEN', 'valid-token'):
            response = client.post("/api/v1/ai/suno/callback", json={
                "callbackType": "complete",
                "taskId": "vendor-task",
                "data": {
                    "sunoData": [{"audioUrl": "https://cdn.example.com/song.mp3"}],
                },
            })

        assert response.status_code == 403

    def test_suno_callback_updates_task_with_valid_token(self, client, db_session):
        from models.task import Task

        task = Task(user_id=1, task_id_vendor="suno/vendor-task-2", status="processing", category="audio", tool_type="general")
        db_session.add(task)
        db_session.commit()

        with patch('api.generation.settings.SUNO_CALLBACK_TOKEN', 'valid-token'):
            response = client.post(
                "/api/v1/ai/suno/callback?token=valid-token",
                json={
                    "callbackType": "complete",
                    "taskId": "vendor-task-2",
                    "data": {
                        "sunoData": [{"audioUrl": "https://cdn.example.com/song.mp3"}],
                    },
                },
            )

        db_session.refresh(task)

        assert response.status_code == 200
        assert task.status == "success"
        assert task.output_url == "https://cdn.example.com/song.mp3"

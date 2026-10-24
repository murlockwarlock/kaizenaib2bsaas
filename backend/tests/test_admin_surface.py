from core.security import create_access_token, get_password_hash
from models.user import User
from unittest.mock import patch


def _admin_headers(db_session):
    admin = User(
        email="admin-surface@example.com",
        hashed_password=get_password_hash("password123"),
        balance=0,
        is_verified=True,
        is_active=True,
        is_superuser=True,
    )
    db_session.add(admin)
    db_session.commit()
    token = create_access_token({"sub": admin.email, "pv": admin.password_version})
    return {"Authorization": f"Bearer {token}"}


def test_all_admin_read_surfaces_require_admin(client, auth_headers):
    paths = [
        "/api/v1/admin/stats",
        "/api/v1/admin/analytics",
        "/api/v1/admin/users",
        "/api/v1/admin/tasks",
        "/api/v1/admin/logs",
        "/api/v1/admin/audio-tasks",
        "/api/v1/admin/promotions",
        "/api/v1/admin/banners",
        "/api/v1/admin/featured-audio",
        "/api/v1/admin/faqs",
        "/api/v1/admin/examples",
        "/api/v1/admin/settings",
        "/api/v1/admin/feedbacks",
        "/api/v1/admin/prices",
        "/api/v1/admin/pricing-plans",
        "/api/v1/admin/plan-invites",
        "/api/v1/admin/utm-links",
        "/api/v1/admin/plan-grants",
        "/api/v1/billing/admin/payments",
        "/api/v1/billing/admin/promocodes",
        "/api/v1/billing/admin/subscriptions",
    ]

    for path in paths:
        response = client.get(path, headers=auth_headers)
        assert response.status_code == 403, (path, response.text)


def test_admin_can_read_dashboard_and_billing_surfaces(client, db_session):
    headers = _admin_headers(db_session)
    paths = [
        "/api/v1/admin/stats",
        "/api/v1/admin/analytics",
        "/api/v1/admin/users",
        "/api/v1/admin/tasks",
        "/api/v1/admin/logs",
        "/api/v1/admin/audio-tasks",
        "/api/v1/admin/promotions",
        "/api/v1/admin/banners",
        "/api/v1/admin/featured-audio",
        "/api/v1/admin/faqs",
        "/api/v1/admin/examples",
        "/api/v1/admin/settings",
        "/api/v1/admin/feedbacks",
        "/api/v1/admin/prices",
        "/api/v1/admin/pricing-plans",
        "/api/v1/admin/plan-invites",
        "/api/v1/admin/utm-links",
        "/api/v1/admin/plan-grants",
        "/api/v1/billing/admin/payments",
        "/api/v1/billing/admin/promocodes",
        "/api/v1/billing/admin/subscriptions",
    ]

    for path in paths:
        response = client.get(path, headers=headers)
        assert response.status_code == 200, (path, response.text)


def test_admin_stats_degrade_when_provider_quota_is_unavailable(client, db_session):
    headers = _admin_headers(db_session)
    with patch(
        "api.admin.get_kie_remaining_credits_sync",
        side_effect=RuntimeError("KIE is unavailable"),
    ):
        response = client.get("/api/v1/admin/stats", headers=headers)

    assert response.status_code == 200
    assert response.json()["kie_remaining_credits"] is None


def test_admin_billing_read_surfaces_work_when_checkout_is_disabled(client, db_session):
    headers = _admin_headers(db_session)
    with patch("api.billing.settings.BILLING_ENABLED", False):
        for path in (
            "/api/v1/billing/admin/payments",
            "/api/v1/billing/admin/promocodes",
            "/api/v1/billing/admin/subscriptions",
        ):
            response = client.get(path, headers=headers)
            assert response.status_code == 200, (path, response.text)

        quote_response = client.post(
            "/api/v1/billing/quote",
            headers=headers,
            json={"purchase_type": "credit_pack", "amount_rub": 100},
        )
        assert quote_response.status_code == 503


def test_admin_balance_adjustment_is_visible_in_client_profile(client, db_session):
    headers = _admin_headers(db_session)
    user = User(
        email="balance-target@example.com",
        hashed_password=get_password_hash("password123"),
        balance=10,
        is_verified=True,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    response = client.patch(
        f"/api/v1/admin/users/{user.id}/balance",
        headers=headers,
        json={"amount": 7.25},
    )
    assert response.status_code == 200
    assert float(response.json()["balance"]) == 17.25

    token = create_access_token({"sub": user.email, "pv": user.password_version})
    profile = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert profile.status_code == 200
    assert float(profile.json()["balance"]) == 17.25

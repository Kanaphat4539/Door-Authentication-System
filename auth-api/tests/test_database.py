import pytest
from app.config import Settings
from app.services.database import (
    DatabaseConnectionError,
    get_user_profile,
    normalize_role,
)
from app.security.tokens import create_access_token, decode_access_token
from fastapi.testclient import TestClient
from app.main import create_app


KEY = "test-only-signing-key-with-at-least-32-bytes!"


def test_normalize_role():
    assert normalize_role("STUDENT") == "student"
    assert normalize_role("PROFESSOR") == "teacher"
    assert normalize_role("ADMIN") == "admin"
    assert normalize_role("STAFF") == "staff"
    assert normalize_role("unknown") == "unknown"
    assert normalize_role(None) == "student"


def test_get_user_profile_returns_none_when_db_host_empty():
    settings = Settings(
        jwt_secret=KEY,
        auth_mode="mock",
        db_host="",
    )
    assert get_user_profile("student", settings) is None


def test_token_with_role_and_user_id():
    settings = Settings(
        jwt_secret=KEY,
        auth_mode="mock",
        jwt_issuer="auth-api",
        jwt_audience="door-system",
    )
    token = create_access_token(
        "prof01",
        settings,
        role="teacher",
        user_id="11111111-2222-3333-4444-555555555555",
    )
    claims = decode_access_token(token, settings)
    assert claims["sub"] == "prof01"
    assert claims["role"] == "teacher"
    assert claims["user_id"] == "11111111-2222-3333-4444-555555555555"


def test_login_with_db_profile(monkeypatch):
    settings = Settings(
        jwt_secret=KEY,
        auth_mode="mock",
        mock_username="prof01",
        mock_password="secretpassword",
        db_host="192.168.100.102",
    )
    app = create_app(settings)
    client = TestClient(app)

    # Mock DB return
    fake_profile = {
        "user_id": "99999999-8888-7777-6666-555555555555",
        "username": "prof01",
        "role": "teacher",
        "raw_role": "PROFESSOR",
        "is_active": True,
        "prefix_th": "ศ.",
        "first_name_th": "สมศักดิ์",
        "last_name_th": "วิเศษ",
    }
    monkeypatch.setattr(
        "app.routes.auth.get_user_profile",
        lambda username, s: fake_profile,
    )

    login_resp = client.post(
        "/auth/login",
        json={"username": "prof01", "password": "secretpassword"},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    me_resp = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json() == {
        "username": "prof01",
        "role": "teacher",
        "user_id": "99999999-8888-7777-6666-555555555555",
    }


def test_login_rejected_when_user_disabled_in_db(monkeypatch):
    settings = Settings(
        jwt_secret=KEY,
        auth_mode="mock",
        mock_username="banned_user",
        mock_password="secretpassword",
        db_host="192.168.100.102",
    )
    app = create_app(settings)
    client = TestClient(app)

    fake_profile = {
        "user_id": "00000000-0000-0000-0000-000000000000",
        "username": "banned_user",
        "role": "student",
        "raw_role": "STUDENT",
        "is_active": False,
    }
    monkeypatch.setattr(
        "app.routes.auth.get_user_profile",
        lambda username, s: fake_profile,
    )

    login_resp = client.post(
        "/auth/login",
        json={"username": "banned_user", "password": "secretpassword"},
    )
    assert login_resp.status_code == 403
    assert login_resp.json()["detail"] == "Account is disabled"


def test_login_db_error_returns_503(monkeypatch):
    settings = Settings(
        jwt_secret=KEY,
        auth_mode="mock",
        mock_username="prof01",
        mock_password="secretpassword",
        db_host="192.168.100.102",
    )
    app = create_app(settings)
    client = TestClient(app)

    def db_fail(username, s):
        raise DatabaseConnectionError("Connection timeout")

    monkeypatch.setattr("app.routes.auth.get_user_profile", db_fail)

    login_resp = client.post(
        "/auth/login",
        json={"username": "prof01", "password": "secretpassword"},
    )
    assert login_resp.status_code == 503
    assert login_resp.json()["detail"] == "Database service unavailable"


def test_radius_role_from_filter_id(monkeypatch):
    import jwt
    from app.services import radius
    from pyrad.packet import AccessAccept

    def send(request, _settings):
        reply = request.CreateReply()
        reply.code = AccessAccept
        reply["Filter-Id"] = "PROFESSOR"
        reply.add_message_authenticator()
        return reply.ReplyPacket()

    monkeypatch.setattr(radius, "_exchange", send)
    settings = Settings(
        jwt_secret=KEY,
        auth_mode="radius",
        radius_host="127.0.0.1",
        radius_secret="test-radius-secret",
    )
    app = create_app(settings)
    client = TestClient(app)

    resp = client.post("/auth/login", json={"username": "prof01", "password": "secret"})
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    claims = jwt.decode(token, KEY, algorithms=["HS256"], audience="door-system", issuer="auth-api")
    assert claims["role"] == "teacher"


def test_radius_role_inferred_for_student(monkeypatch):
    import jwt
    from app.services import radius
    from pyrad.packet import AccessAccept

    def send(request, _settings):
        reply = request.CreateReply()
        reply.code = AccessAccept
        reply.add_message_authenticator()
        return reply.ReplyPacket()

    monkeypatch.setattr(radius, "_exchange", send)
    settings = Settings(
        jwt_secret=KEY,
        auth_mode="radius",
        radius_host="127.0.0.1",
        radius_secret="test-radius-secret",
    )
    app = create_app(settings)
    client = TestClient(app)

    resp = client.post("/auth/login", json={"username": "67200030", "password": "secret"})
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    claims = jwt.decode(token, KEY, algorithms=["HS256"], audience="door-system", issuer="auth-api")
    assert claims["sub"] == "67200030"
    assert claims["role"] == "student"

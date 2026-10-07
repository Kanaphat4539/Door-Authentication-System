from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi.testclient import TestClient

KEY = "test-only-signing-key-with-at-least-32-bytes"


def settings(**changes):
    from app.config import Settings

    values = dict(
        _env_file=None, auth_mode="mock", jwt_secret=KEY,
        mock_username="student", mock_password="test-password",
    )
    values.update(changes)
    return Settings(**values)


def client(**changes):
    from app.main import create_app

    return TestClient(create_app(settings(**changes)))


def test_login_and_me_round_trip():
    api = client()
    response = api.post("/auth/login", json={"username": "student", "password": "test-password"})
    assert response.status_code == 200
    result = response.json()
    assert result["token_type"] == "bearer"
    assert result["expires_in"] == 900
    assert "test-password" not in str(result)
    claims = jwt.decode(result["access_token"], KEY, algorithms=["HS256"], audience="door-system", issuer="auth-api")
    assert claims["sub"] == "student"
    assert "password" not in claims
    me = api.get("/auth/me", headers={"Authorization": f"Bearer {result['access_token']}"})
    assert me.status_code == 200
    assert me.json() == {"username": "student"}
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("username,password", [("student", "wrong"), ("other", "test-password")])
def test_wrong_credentials_do_not_issue_token(username, password):
    response = client().post("/auth/login", json={"username": username, "password": password})
    assert response.status_code == 401
    assert "access_token" not in response.json()


@pytest.mark.parametrize("changes", [
    {"auth_mode": "radius", "radius_host": "", "radius_secret": ""},
    {"jwt_secret": ""},
    {"mock_username": "", "mock_password": ""},
])
def test_missing_configuration_fails_closed(changes):
    api = client(**changes)
    assert api.get("/health").status_code == 200
    response = api.post("/auth/login", json={"username": "student", "password": "test-password"})
    assert response.status_code == 503
    assert "access_token" not in response.json()


@pytest.mark.parametrize("headers", [{}, {"Authorization": "Bearer nonsense"}, {"Authorization": "Basic abc"}])
def test_me_requires_valid_bearer_token(headers):
    response = client().get("/auth/me", headers=headers)
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


@pytest.mark.parametrize("kind", ["expired", "wrong-key", "wrong-audience", "wrong-issuer", "missing-exp", "empty-sub", "wrong-algorithm"])
def test_invalid_tokens_are_rejected(kind):
    now = datetime.now(timezone.utc)
    claims = {"sub": "student", "iat": now, "exp": now + timedelta(minutes=5), "iss": "auth-api", "aud": "door-system"}
    key, algorithm = KEY, "HS256"
    if kind == "expired":
        claims["exp"] = now - timedelta(seconds=1)
    elif kind == "wrong-key":
        key = "another-test-only-key-at-least-32-bytes"
    elif kind == "wrong-audience":
        claims["aud"] = "another-service"
    elif kind == "wrong-issuer":
        claims["iss"] = "another-issuer"
    elif kind == "missing-exp":
        del claims["exp"]
    elif kind == "empty-sub":
        claims["sub"] = ""
    elif kind == "wrong-algorithm":
        algorithm = "HS384"
        key = "test-only-key-for-sha384-at-least-48-bytes-long-string"
    token = jwt.encode(claims, key, algorithm=algorithm)
    assert client().get("/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


@pytest.mark.parametrize("payload", [
    {"username": "", "password": "test-password"},
    {"username": "   ", "password": "test-password"},
    {"username": "student", "password": ""},
    {"username": "student", "password": {"secret": "sensitive-value"}},
])
def test_bad_input_does_not_echo_credentials(payload):
    response = client().post("/auth/login", json=payload)
    assert response.status_code == 422
    assert "test-password" not in response.text
    assert "sensitive-value" not in response.text


@pytest.mark.parametrize("reply_code,status", [(2, 200), (3, 401), (11, 503)])
def test_radius_reply_mapping(monkeypatch, reply_code, status):
    from app.services import radius

    def send(request, _settings):
        assert request["User-Name"] == ["student"]
        assert request.PwDecrypt(request["User-Password"][0]) == "test-password"
        assert request.message_authenticator
        reply = request.CreateReply()
        reply.code = reply_code
        reply.add_message_authenticator()
        return reply.ReplyPacket()

    monkeypatch.setattr(radius, "_exchange", send)
    response = client(auth_mode="radius", radius_host="127.0.0.1", radius_secret="test-radius-secret").post(
        "/auth/login", json={"username": "student", "password": "test-password"},
    )
    assert response.status_code == status


def test_radius_timeout_never_falls_back_to_mock(monkeypatch):
    from app.services import radius

    def send(_request, _settings):
        raise TimeoutError()

    monkeypatch.setattr(radius, "_exchange", send)
    response = client(auth_mode="radius", radius_host="127.0.0.1", radius_secret="test-radius-secret").post(
        "/auth/login", json={"username": "student", "password": "test-password"},
    )
    assert response.status_code == 503
    assert "access_token" not in response.json()


@pytest.mark.parametrize("kind", ["missing-ma", "tampered", "malformed"])
def test_untrusted_radius_responses_do_not_issue_tokens(monkeypatch, kind):
    from app.services import radius

    def send(request, _settings):
        if kind == "malformed":
            return b"invalid"
        reply = request.CreateReply()
        if kind != "missing-ma":
            reply.add_message_authenticator()
        raw = reply.ReplyPacket()
        if kind == "tampered":
            raw = raw[:4] + bytes([raw[4] ^ 1]) + raw[5:]
        return raw

    monkeypatch.setattr(radius, "_exchange", send)
    response = client(auth_mode="radius", radius_host="127.0.0.1", radius_secret="test-radius-secret").post(
        "/auth/login", json={"username": "student", "password": "test-password"},
    )
    assert response.status_code == 503
    assert "access_token" not in response.json()


def test_settings_reject_short_signing_key():
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        settings(jwt_secret="short")


def test_default_mode_is_radius():
    from app.config import Settings

    assert Settings(_env_file=None).auth_mode == "radius"


@pytest.mark.parametrize("identifier", ["", "   ", "x" * 254, "ก" * 85])
def test_settings_reject_nas_identifier_that_cannot_be_encoded(identifier):
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        settings(radius_nas_identifier=identifier)

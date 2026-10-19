"""
End-to-End (E2E) Comprehensive Test Suite for Group 4 Member 4
"""

import time
import jwt
from fastapi.testclient import TestClient
from app.main import app
from app.security import JWT_SECRET, JWT_ALGORITHM, create_access_token
from app.group3_client import Group3AuthClient

client = TestClient(app)


# -------------------------------------------------------------
# 1. Health & Metadata Tests
# -------------------------------------------------------------
def test_e2e_health_check():
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert data["member"] == 4
    assert "docs_url" in data


# -------------------------------------------------------------
# 2. Authentication Flow (Member 1 -> Member 4)
# -------------------------------------------------------------
def test_e2e_login_teacher_success():
    res = client.post(
        "/api/v1/auth/login",
        json={"username": "teacher_ajarn", "password": "secure123"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["token_type"] == "bearer"
    assert data["user"]["role"] == "teacher"

    token = data["access_token"]
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    assert payload["sub"] == "teacher_ajarn"
    assert payload["role"] == "teacher"
    assert payload["exp"] > payload["iat"]


def test_e2e_login_student_success():
    res = client.post(
        "/api/v1/auth/login",
        json={"username": "student_somchai", "password": "1234"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["role"] == "student"


def test_e2e_login_wrong_credentials():
    res = client.post(
        "/api/v1/auth/login",
        json={"username": "teacher_ajarn", "password": "wrong_password_999"},
    )
    assert res.status_code == 401
    assert "Invalid username or password" in res.json()["detail"]


def test_e2e_login_missing_fields():
    res = client.post("/api/v1/auth/login", json={"username": "", "password": ""})
    assert res.status_code in (400, 422)


# -------------------------------------------------------------
# 3. RBAC & Integration Flow (Member 6 Protected Logs)
# -------------------------------------------------------------
def test_e2e_teacher_can_access_and_filter_logs():
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "teacher_ajarn", "password": "secure123"},
    )
    token = login_res.json()["access_token"]

    res = client.get(
        "/api/v1/logs?keyword=Somchai&page=1&limit=5",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["authorized_by"] == "teacher_ajarn"
    assert data["role"] == "teacher"
    assert len(data["data"]) >= 1
    assert "Somchai" in data["data"][0]["student_name"]


def test_e2e_student_is_blocked_from_logs():
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "student_somchai", "password": "1234"},
    )
    token = login_res.json()["access_token"]

    res = client.get(
        "/api/v1/logs",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403
    assert "requires teacher privileges" in res.json()["detail"]


# -------------------------------------------------------------
# 4. Security Edge Cases (Tampering, Expiration, Malformed)
# -------------------------------------------------------------
def test_e2e_tampered_token_rejected():
    token = create_access_token(username="teacher_ajarn", role="teacher")
    tampered = token[:-4] + "fake"

    res = client.get(
        "/api/v1/logs",
        headers={"Authorization": f"Bearer {tampered}"},
    )
    assert res.status_code == 401
    assert "Invalid token" in res.json()["detail"]


def test_e2e_expired_token_rejected():
    past_exp = int(time.time()) - 10
    payload = {"sub": "teacher_ajarn", "role": "teacher", "exp": past_exp}
    expired_token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    res = client.get(
        "/api/v1/logs",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert res.status_code == 401
    assert "Token has expired" in res.json()["detail"]


def test_e2e_missing_authorization_header():
    res = client.get("/api/v1/logs")
    assert res.status_code in (401, 403)


# -------------------------------------------------------------
# 5. Group 3 Client Verification Logic
# -------------------------------------------------------------
def test_e2e_group3_client_mock_mode():
    client_g3 = Group3AuthClient(api_url="", mock_fallback=True)
    is_valid, role = client_g3.verify("teacher_ajarn", "secure123")
    assert is_valid is True
    assert role == "teacher"

    is_valid, role = client_g3.verify("teacher_ajarn", "wrong")
    assert is_valid is False
    assert role is None

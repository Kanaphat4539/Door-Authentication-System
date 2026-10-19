from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_health():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "online"


def test_login_invalid_credentials():
    res = client.post(
        "/api/v1/auth/login",
        json={"username": "wrong_user", "password": "wrong_password"},
    )
    assert res.status_code == 401
    assert "Invalid username or password" in res.json()["detail"]


def test_login_teacher_success():
    res = client.post(
        "/api/v1/auth/login",
        json={"username": "teacher_ajarn", "password": "secure123"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["role"] == "teacher"
    assert data["user"]["username"] == "teacher_ajarn"


def test_login_student_success():
    res = client.post(
        "/api/v1/auth/login",
        json={"username": "student_somchai", "password": "1234"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["role"] == "student"


def test_login_group3_official_student():
    res = client.post(
        "/api/v1/auth/login",
        json={"username": "student", "password": "local-demo-password"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["user"]["username"] == "student"
    assert data["user"]["role"] == "student"


def test_protected_route_without_token():
    res = client.get("/api/v1/logs")
    assert res.status_code in [401, 403]


def test_protected_logs_with_student_token():
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "student_somchai", "password": "1234"},
    )
    token = login_res.json()["access_token"]

    # Student can access /api/v1/logs with scoped isolation
    res = client.get(
        "/api/v1/logs",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert res.json()["role"] == "student"
    assert res.json()["is_student_isolated"] is True

    # Student is blocked from teacher-only endpoint /api/v1/admin/logs
    admin_res = client.get(
        "/api/v1/admin/logs",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert admin_res.status_code == 403
    assert "requires teacher privileges" in admin_res.json()["detail"]


def test_protected_logs_with_teacher_token():
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "teacher_ajarn", "password": "secure123"},
    )
    token = login_res.json()["access_token"]

    res = client.get(
        "/api/v1/logs",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["role"] == "teacher"
    assert len(data["data"]) > 0


def test_auth_me_endpoint():
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "teacher_ajarn", "password": "secure123"},
    )
    token = login_res.json()["access_token"]

    res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert res.json()["user"]["username"] == "teacher_ajarn"
    assert res.json()["user"]["role"] == "teacher"

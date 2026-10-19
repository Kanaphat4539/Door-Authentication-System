from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.services.audit_service import _execute_insert
from app.core.security import create_access_token

client = TestClient(app)


def test_audit_log_sql_execution():
    with patch("app.services.audit_service.engine.begin") as mock_engine_begin:
        mock_conn = MagicMock()
        mock_engine_begin.return_value.__enter__.return_value = mock_conn

        success = _execute_insert(username="teacher_ajarn", action="Login", role="teacher")
        assert success is True

        assert mock_conn.execute.called
        call_args = mock_conn.execute.call_args
        sql_obj = call_args[0][0]
        params = call_args[0][1]

        assert "INSERT INTO user (username, role, action, timestamp)" in str(sql_obj)
        assert "VALUES (:username, :role, :action, NOW())" in str(sql_obj)
        assert params == {"username": "teacher_ajarn", "role": "teacher", "action": "Login"}


def test_audit_log_exception_safety():
    with patch("app.services.audit_service.engine.begin", side_effect=Exception("Database Connection Timed Out")):
        result = _execute_insert(username="teacher_ajarn", action="Login", role="teacher")
        assert result is False


def test_audit_log_endpoint_with_valid_teacher_token():
    token = create_access_token(username="teacher_ajarn", role="teacher")

    res1 = client.post(
        "/api/v1/audit/log",
        headers={"Authorization": f"Bearer {token}"},
        json={"action": "Login>Search>Student"},
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["status"] == "success"
    assert data1["action"] == "Login>Search>Student"
    assert data1["username"] == "teacher_ajarn"
    assert data1["role"] == "teacher"


def test_audit_log_endpoint_with_valid_student_token():
    token = create_access_token(username="65010234", role="student")

    res = client.post(
        "/api/v1/audit/log",
        headers={"Authorization": f"Bearer {token}"},
        json={"action": "Login>ViewMyRoom"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["action"] == "Login>ViewMyRoom"
    assert data["username"] == "65010234"
    assert data["role"] == "student"


def test_audit_log_endpoint_unauthorized():
    res = client.post(
        "/api/v1/audit/log",
        json={"action": "Login>Search>Student"},
    )
    assert res.status_code == 401

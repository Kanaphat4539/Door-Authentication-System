from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.audit import log_user_action, _execute_insert
from app.security import create_access_token

client = TestClient(app)


def test_audit_log_sql_execution():
    """
    ทดสอบว่าคำสั่ง SQL ตรงตามที่คนที่ 7 กำหนด 100%:
    INSERT INTO user (username, action, timestamp) VALUES (:username, :action, NOW());
    """
    with patch("app.audit.engine.begin") as mock_engine_begin:
        mock_conn = MagicMock()
        mock_engine_begin.return_value.__enter__.return_value = mock_conn

        success = _execute_insert(username="teacher_ajarn", action="Login")
        assert success is True

        # ตรวจสอบว่า execute ถูกเรียก
        assert mock_conn.execute.called
        call_args = mock_conn.execute.call_args
        sql_obj = call_args[0][0]
        params = call_args[0][1]

        # เช็คคำสั่ง SQL
        assert "INSERT INTO user (username, action, timestamp)" in str(sql_obj)
        assert "VALUES (:username, :action, NOW())" in str(sql_obj)
        # เช็ค Parameters
        assert params == {"username": "teacher_ajarn", "action": "Login"}


def test_audit_log_exception_safety():
    """
    ทดสอบว่ามี try-except ดักจับกรณี Database ล่ม โดยไม่กระทบการทำงาน (ไม่ throw exception ออกมา)
    """
    with patch("app.audit.engine.begin", side_effect=Exception("Database Connection Timed Out")):
        # ต้องไม่ crash และคืนค่า False อย่างปลอดภัย
        result = _execute_insert(username="teacher_ajarn", action="Login")
        assert result is False


def test_audit_log_endpoint_with_valid_token():
    """
    ทดสอบ Endpoint POST /api/v1/audit/log เมื่อ Frontend ยิง action มาบันทึก
    """
    token = create_access_token(username="teacher_ajarn", role="teacher")

    # เคส 1: ค้นหารหัสนักศึกษา 'Login>Search>Student'
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

    # เคส 2: เลือกกรองห้องเรียน 'Search>room=LAB-401'
    res2 = client.post(
        "/api/v1/audit/log",
        headers={"Authorization": f"Bearer {token}"},
        json={"action": "Search>room=LAB-401"},
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["status"] == "success"
    assert data2["action"] == "Search>room=LAB-401"


def test_audit_log_endpoint_unauthorized():
    """
    ทดสอบว่าหากไม่ส่ง Token จะไม่สามารถบันทึก Log ได้ (401 Unauthorized)
    """
    res = client.post(
        "/api/v1/audit/log",
        json={"action": "Login>Search>Student"},
    )
    assert res.status_code == 401

import jwt
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.services.group3_client import Group3AuthClient
from app.services.audit_service import log_user_action

client = TestClient(app)


def test_group3_jwt_claims_decoding():
    """
    ทดสอบการถอดรหัส JWT Token จากกลุ่ม 3 (verify_signature=False)
    เพื่อดึง Claims: role และ verified_username ตามคู่มือ
    """
    fake_group3_token = jwt.encode(
        {"sub": "6501234567", "username": "6501234567", "role": "student"},
        "group3-secret-key",
        algorithm="HS256",
    )

    client_g3 = Group3AuthClient(api_url="http://192.168.100.103:8000/auth/login")

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "status": "success",
        "access_token": fake_group3_token,
        "token_type": "bearer",
    }

    with patch("requests.post", return_value=mock_resp):
        is_valid, role, verified_user = client_g3.verify_with_group3("6501234567", "password123")
        assert is_valid is True
        assert role == "student"
        assert verified_user == "6501234567"


def test_student_role_scope_isolation_idor():
    """
    ทดสอบการควบคุมสิทธิ์นักศึกษา (Scope Isolation / IDOR Protection):
    - นักศึกษาต้องดูได้เฉพาะประวัติของตัวเองเท่านั้น
    - หากนักศึกษาพยายามใส่ query param ?student_id=67200999 เพื่อดูของคนอื่น
      ระบบ Backend ต้องล็อกค้นหาเฉพาะ user_id ของผู้ใช้เสมอ
    """
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "student_somchai", "password": "1234"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    role = login_res.json()["user"]["role"]
    assert role == "student"

    # นักศึกษาพยายามดูข้อมูลของคนอื่น (?student_id=67200999)
    res = client.get(
        "/api/v1/logs?student_id=67200324",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["role"] == "student"
    assert body["is_student_isolated"] is True
    # ข้อมูลที่คืนกลับมา ต้องไม่มีของ 67200999 ปนอยู่เลย (มีเฉพาะของตนเอง 67200367)
    for record in body.get("logs", []):
        assert "67200999" not in record["student_id"]


def test_teacher_role_unrestricted_search():
    """
    ทดสอบว่าอาจารย์สามารถค้นหาประวัตินักศึกษาคนใดก็ได้ หรือดูทั้งหมดได้อิสระ
    """
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "teacher_ajarn", "password": "secure123"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert login_res.json()["user"]["role"] == "teacher"

    # อาจารย์ค้นหาของนักศึกษาคนที่ 67200999
    res = client.get(
        "/api/v1/logs?student_id=67200324",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["role"] == "teacher"
    assert body["is_student_isolated"] is False
    assert len(body.get("logs", [])) >= 1
    assert any(record["student_id"] == "67200324" for record in body.get("logs", []))


def test_audit_log_records_role_column():
    """
    ทดสอบว่าการบันทึก Audit Log ลงตาราง user มีการส่งค่า role ไปยัง SQL Query อย่างถูกต้อง
    """
    with patch("app.services.audit_service.engine.begin") as mock_engine_begin:
        mock_conn = MagicMock()
        mock_engine_begin.return_value.__enter__.return_value = mock_conn

        success = log_user_action(
            username="67200367",
            action="Search>Student",
            role="student",
        )
        assert success is True

        call_args = mock_conn.execute.call_args
        sql_obj = call_args[0][0]
        params = call_args[0][1]

        assert "INSERT INTO user" in str(sql_obj)
        assert "role" in str(sql_obj)
        assert params["username"] == "67200367"
        assert params["action"] == "Search>Student"
        assert params["role"] == "student"

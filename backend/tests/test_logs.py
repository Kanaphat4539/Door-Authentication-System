from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token

client = TestClient(app)


def test_logs_filtering_by_student_id():
    token = create_access_token(username="teacher_ajarn", role="teacher")
    res = client.get(
        "/api/v1/logs?student_id=67200324",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "logs" in data
    assert "pagination" in data
    for item in data["logs"]:
        assert "67200324" in item["student_id"] or "67200324" in item["name"]


def test_logs_filtering_by_room():
    token = create_access_token(username="teacher_ajarn", role="teacher")
    res = client.get(
        "/api/v1/logs?room=B316",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    for item in data["logs"]:
        assert item["room"] == "B316"


def test_legacy_dashboard_data_endpoint():
    token = create_access_token(username="teacher_ajarn", role="teacher")
    res = client.get(
        "/api/get_dashboard_data.php",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"


def test_student_can_only_see_own_logs_even_if_query_targets_other_student():
    student_token = create_access_token(username="67200324", role="student")
    res = client.get(
        "/api/v1/logs?student_id=65010888&keyword=67200324",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["role"] == "student"
    assert body["requested_by"] == "67200324"
    for log in body.get("logs", []):
        assert log["student_id"] == "67200324"


def test_teacher_can_search_all_student_logs():
    teacher_token = create_access_token(username="teacher_ajarn", role="teacher")
    res = client.get(
        "/api/v1/logs?keyword=67200324",
        headers={"Authorization": f"Bearer {teacher_token}"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["role"] == "teacher"
    assert len(body.get("logs", [])) >= 1
    assert any(log["student_id"] == "67200324" for log in body.get("logs", []))


def test_blocks_unsupported_role():
    hacker_token = create_access_token(username="attacker", role="hacker")
    res = client.get(
        "/api/v1/logs",
        headers={"Authorization": f"Bearer {hacker_token}"},
    )
    assert res.status_code == 403

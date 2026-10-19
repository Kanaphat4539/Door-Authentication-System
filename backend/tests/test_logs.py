from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token

client = TestClient(app)


def test_logs_filtering_by_student_id():
    token = create_access_token(username="teacher_ajarn", role="teacher")
    res = client.get(
        "/api/v1/logs?student_id=65010234",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "logs" in data
    assert "pagination" in data
    for item in data["logs"]:
        assert "65010234" in item["student_id"] or "65010234" in item["name"]


def test_logs_filtering_by_room():
    token = create_access_token(username="teacher_ajarn", role="teacher")
    res = client.get(
        "/api/v1/logs?room=B217",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    for item in data["logs"]:
        assert item["room"] == "B217"


def test_legacy_dashboard_data_endpoint():
    token = create_access_token(username="teacher_ajarn", role="teacher")
    res = client.get(
        "/api/get_dashboard_data.php",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"

from fastapi.testclient import TestClient
from app.main import app
from app.services.iot_service import validate_log_entry

client = TestClient(app)


def test_iot_validation_valid():
    valid_entry = {
        "timestamp": "2026-10-14 10:00:00",
        "student_id": "65010234",
        "student_name": "Thanaphat Sukhasem",
        "room": "B217",
        "status": "IN",
    }
    is_valid, reason = validate_log_entry(valid_entry)
    assert is_valid is True
    assert reason is None


def test_iot_validation_invalid_student_id():
    invalid_entry = {
        "timestamp": "2026-10-14 10:00:00",
        "student_id": "123",  # only 3 chars, needs 8
        "student_name": "Test User",
        "room": "B217",
        "status": "IN",
    }
    is_valid, reason = validate_log_entry(invalid_entry)
    assert is_valid is False
    assert "8 หลัก" in reason


def test_iot_validation_invalid_status():
    invalid_entry = {
        "timestamp": "2026-10-14 10:00:00",
        "student_id": "65010234",
        "student_name": "Test User",
        "room": "B217",
        "status": "UNKNOWN",
    }
    is_valid, reason = validate_log_entry(invalid_entry)
    assert is_valid is False
    assert "IN หรือ OUT" in reason


def test_iot_status_endpoint():
    res = client.get("/api/v1/iot/status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert "iot_url" in data

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token

client = TestClient(app)

def test_teacher_stat_cards_not_reduced_by_search_filter():
    teacher_token = create_access_token(username="ajarn_somchai", role="teacher")
    headers = {"Authorization": f"Bearer {teacher_token}"}

    # Unfiltered
    res_all = client.get("/api/v1/logs", headers=headers)
    assert res_all.status_code == 200
    data_all = res_all.json()
    all_active_rooms = data_all.get("activeRooms")
    all_total_access = data_all.get("totalAccess")

    # Filtered by room
    res_filtered = client.get("/api/v1/logs?room=B316", headers=headers)
    assert res_filtered.status_code == 200
    data_filtered = res_filtered.json()

    # The stat cards MUST show overall statistics, not filtered down
    assert data_filtered.get("activeRooms") == all_active_rooms
    assert data_filtered.get("totalAccess") == all_total_access

def test_student_stat_cards_scope_to_own_and_not_reduced_by_filter():
    student_token = create_access_token(username="67200324", role="student")
    headers = {"Authorization": f"Bearer {student_token}"}

    # Student unfiltered
    res_student = client.get("/api/v1/logs", headers=headers)
    assert res_student.status_code == 200
    student_data = res_student.json()
    std_rooms = student_data.get("activeRooms")
    std_access = student_data.get("totalAccess")

    # Student filtered by room
    res_std_filtered = client.get("/api/v1/logs?room=B316", headers=headers)
    assert res_std_filtered.status_code == 200
    std_filtered_data = res_std_filtered.json()

    # Stat cards remain student's overall stats
    assert std_filtered_data.get("activeRooms") == std_rooms
    assert std_filtered_data.get("totalAccess") == std_access

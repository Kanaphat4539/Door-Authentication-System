import pytest
from app.group3_client import group3_client


@pytest.fixture(autouse=True)
def fast_tests():
    """
    ลด Timeout ของ Group 3 ลงชั่วคราวในการรันเทสต์ เพื่อให้ pytest รันได้อย่างรวดเร็วใน 1 วินาที
    """
    orig_timeout = group3_client.timeout
    group3_client.timeout = 0.2
    yield
    group3_client.timeout = orig_timeout

import requests
from typing import Optional, Dict, Tuple
from app.core.config import settings

# Mock database สำหรับการพัฒนาและการทดสอบ offline
MOCK_ACCOUNTS: Dict[str, Dict[str, str]] = {
    # บัญชีทางการจากกลุ่ม 3 (API-Ser)
    "student": {"password": "local-demo-password", "role": "student"},
    # บัญชีทดสอบของกลุ่ม 4 (Web-App)
    "instructor@university.ac.th": {"password": "Password123", "role": "teacher"},
    "teacher_ajarn": {"password": "secure123", "role": "teacher"},
    "teacher_somchai": {"password": "password123", "role": "teacher"},
    "student_somchai": {"password": "1234", "role": "student"},
    "student_mori": {"password": "password4321", "role": "student"},
}


class Group3AuthClient:
    """
    Client สำหรับเชื่อมต่อไปยัง Central Authentication Service (กลุ่ม 3)
    ตามข้อกำหนดของ Group 4 Member 4
    """

    def __init__(
        self,
        api_url: Optional[str] = None,
        timeout: Optional[float] = None,
        mock_fallback: Optional[bool] = None,
    ):
        self.api_url = api_url if api_url is not None else settings.GROUP3_AUTH_URL
        self.timeout = timeout if timeout is not None else settings.GROUP3_TIMEOUT_SECONDS
        self.mock_fallback = mock_fallback if mock_fallback is not None else settings.USE_MOCK_FALLBACK

    def is_external_configured(self) -> bool:
        """ตรวจสอบว่ามีการระบุ URL กลุ่ม 3 ภายนอกจริงหรือไม่"""
        if not self.api_url:
            return False
        if "mock" in self.api_url.lower():
            return False
        return True

    def verify(self, username: str, password: str) -> Tuple[bool, Optional[str]]:
        """
        ส่งคำขอยืนยันตัวตนไปยังกลุ่ม 3 ผ่าน HTTP POST
        Returns:
            (is_valid: bool, role: Optional[str])
        """
        if self.is_external_configured():
            try:
                payload = {"username": username, "password": password}
                response = requests.post(
                    self.api_url,
                    json=payload,
                    timeout=self.timeout,
                    headers={"Content-Type": "application/json"},
                )
                if response.status_code == 200:
                    data = response.json()
                    role = data.get("role") or data.get("user", {}).get("role", "teacher")
                    return True, role
                elif response.status_code in (400, 401, 403, 404):
                    return False, None
            except Exception:
                if not self.mock_fallback:
                    return False, None

        if self.mock_fallback:
            account = MOCK_ACCOUNTS.get(username)
            if account and account["password"] == password:
                return True, account["role"]
            return False, None

        return False, None


group3_client = Group3AuthClient()

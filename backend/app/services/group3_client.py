import os
import requests
import jwt
from typing import Optional, Dict, Any, Tuple
from app.core.config import settings

# Mock database สำหรับการพัฒนาและการทดสอบ offline (รองรับ Dual-Role: Teacher & Student)
MOCK_ACCOUNTS: Dict[str, Dict[str, Any]] = {
    # บัญชีทางการและทดสอบอาจารย์ (Teacher)
    "admin": {"password": "Password1234!", "role": "teacher", "username": "admin"},
    "instructor@university.ac.th": {"password": "Password123", "role": "teacher", "username": "instructor@university.ac.th"},
    "teacher_ajarn": {"password": "secure123", "role": "teacher", "username": "teacher_ajarn"},
    "teacher_somchai": {"password": "password123", "role": "teacher", "username": "teacher_somchai"},
    "teacher_test": {"password": "Password1234!", "role": "teacher", "username": "teacher_test"},

    # บัญชีทางการและทดสอบนักศึกษา (Student)
    "student": {"password": "local-demo-password", "role": "student", "username": "student"},
    "student_somchai": {"password": "1234", "role": "student", "username": "67200367"},
    "67200367": {"password": "1234", "role": "student", "username": "67200367"},
    "67200324": {"password": "Password1234!", "role": "student", "username": "67200324"},
    "6501234567": {"password": "1234", "role": "student", "username": "6501234567"},
    "student_mori": {"password": "password4321", "role": "student", "username": "student_mori"},
    "student_test": {"password": "Password1234!", "role": "student", "username": "student_test"},
    "official_std": {"password": "testpass123", "role": "student", "username": "official_std"},
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

    def verify_with_group3(
        self, username: str, password: str
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        ส่งคำขอยืนยันตัวตนไปยังกลุ่ม 3 พร้อมถอดรหัส JWT Token
        Returns:
            (is_valid: bool, role: Optional[str], verified_user: Optional[str])
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
                    token = data.get("access_token")

                    # ถอดรหัส JWT จากกลุ่ม 3 เพื่อเอา Claims (role และ username)
                    if token:
                        try:
                            decoded = jwt.decode(token, options={"verify_signature": False})
                            role = decoded.get("role", "student")
                            verified_user = decoded.get("username") or decoded.get("sub", username)
                            return True, role, verified_user
                        except Exception:
                            pass

                    # Fallback กรณีกลุ่ม 3 ส่งข้อมูล User ใน Body โดยตรง
                    role = (
                        data.get("role")
                        or (data.get("user", {}).get("role") if isinstance(data.get("user"), dict) else None)
                    )
                    verified_user = (
                        (data.get("user", {}).get("username") if isinstance(data.get("user"), dict) else None)
                        or data.get("username", username)
                    )

                    # หากกลุ่ม 3 ยังไม่ได้คืนฟิลด์ role ใน JSON ให้แมปสิทธิ์ตามข้อตกลงของกลุ่ม 4:
                    if not role:
                        uname_lower = username.lower()
                        if any(kw in uname_lower for kw in ["teacher", "ajarn", "instructor", "prof"]):
                            role = "teacher"
                        elif username in MOCK_ACCOUNTS:
                            role = MOCK_ACCOUNTS[username]["role"]
                        else:
                            role = "student"

                    return True, role, verified_user
                elif response.status_code in (400, 401, 403, 404):
                    return False, None, None

            except Exception:
                if not self.mock_fallback:
                    return False, None, None

        if self.mock_fallback:
            account = MOCK_ACCOUNTS.get(username)
            if account and account["password"] == password:
                return True, account["role"], account.get("username", username)
            return False, None, None

        return False, None, None

    def verify(self, username: str, password: str) -> Tuple[bool, Optional[str]]:
        """
        ส่งคำขอยืนยันตัวตนไปยังกลุ่ม 3 ผ่าน HTTP POST
        Returns:
            (is_valid: bool, role: Optional[str])
        """
        is_valid, role, _ = self.verify_with_group3(username, password)
        return is_valid, role

    def authenticate(self, username: str, password: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """Alias สำหรับคืนค่า 3 tuple (is_valid, role, verified_username)"""
        return self.verify_with_group3(username, password)


group3_client = Group3AuthClient()


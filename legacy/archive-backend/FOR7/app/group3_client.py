import os
import requests
from typing import Optional, Dict, Any, Tuple
from fastapi import HTTPException, status
from dotenv import load_dotenv

load_dotenv()

GROUP3_AUTH_URL = os.getenv("GROUP3_AUTH_URL", "")
GROUP3_TIMEOUT_SECONDS = float(os.getenv("GROUP3_TIMEOUT_SECONDS", "5.0"))
USE_MOCK_FALLBACK = os.getenv("USE_MOCK_FALLBACK", "true").lower() in ("true", "1", "yes")

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
        self.api_url = api_url if api_url is not None else GROUP3_AUTH_URL
        self.timeout = timeout if timeout is not None else GROUP3_TIMEOUT_SECONDS
        self.mock_fallback = mock_fallback if mock_fallback is not None else USE_MOCK_FALLBACK

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
        Raises:
            HTTPException(503): เมื่อไม่สามารถติดต่อ Server กลุ่ม 3 ได้
        """
        if self.is_external_configured():
            try:
                payload = {
                    "username": username,
                    "password": password,
                }
                response = requests.post(
                    self.api_url,
                    json=payload,
                    timeout=self.timeout,
                    headers={"Content-Type": "application/json"},
                )

                if response.status_code == 200:
                    data = response.json()
                    role = (
                        data.get("role")
                        or (data.get("user", {}).get("role") if isinstance(data.get("user"), dict) else None)
                    )
                    # หากกลุ่ม 3 ยังไม่ได้คืนฟิลด์ role ใน JSON (ตามเอกสาร REPLY-GROUP4.md)
                    # ให้แมปสิทธิ์ตามข้อตกลงของระบบกลุ่ม 4:
                    if not role:
                        uname_lower = username.lower()
                        if any(kw in uname_lower for kw in ["teacher", "ajarn", "instructor", "prof"]):
                            role = "teacher"
                        elif username in MOCK_ACCOUNTS:
                            role = MOCK_ACCOUNTS[username]["role"]
                        else:
                            role = "student"

                    return True, role
                elif response.status_code in (400, 401, 404):
                    return False, None
                else:
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail=f"Central Auth (Group 3) returned unexpected status: {response.status_code}",
                    )

            except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as err:
                if self.mock_fallback:
                    return self._verify_mock(username, password)
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Unable to reach Group 3 Central Auth Server: {str(err)}",
                )
            except requests.exceptions.RequestException as err:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Group 3 integration error: {str(err)}",
                )

        return self._verify_mock(username, password)

    def _verify_mock(self, username: str, password: str) -> Tuple[bool, Optional[str]]:
        account = MOCK_ACCOUNTS.get(username)
        if account and account["password"] == password:
            return True, account["role"]
        return False, None


group3_client = Group3AuthClient()

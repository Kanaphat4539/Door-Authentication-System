import os
import requests
import jwt
from typing import Optional, Dict, Any, Tuple
from app.core.config import settings

# Mock database สำหรับการพัฒนาและการทดสอบ offline (รองรับ Dual-Role: Teacher & Student)
MOCK_ACCOUNTS: Dict[str, Dict[str, Any]] = {
    # บัญชีทางการและทดสอบอาจารย์ (Teacher)
    "admin": {"password": "Password1234!", "role": "teacher", "username": "admin", "name": "อาจารย์ผู้ดูแลระบบ"},
    "instructor@university.ac.th": {"password": "Password123", "role": "teacher", "username": "instructor@university.ac.th", "name": "อาจารย์ สมชาย ใจดี"},
    "teacher_ajarn": {"password": "secure123", "role": "teacher", "username": "teacher_ajarn", "name": "อาจารย์ สมชาย ใจดี"},
    "teacher_somchai": {"password": "password123", "role": "teacher", "username": "teacher_somchai", "name": "อาจารย์ สมชาย ใจดี"},
    "teacher_test": {"password": "Password1234!", "role": "teacher", "username": "teacher_test", "name": "อาจารย์ผู้สอน (ทดสอบ)"},

    # บัญชีทางการและทดสอบนักศึกษา (Student)
    "student": {"password": "local-demo-password", "role": "student", "username": "student", "name": "นักศึกษา ทดสอบ"},
    "student_somchai": {"password": "1234", "role": "student", "username": "67200367", "name": "นายสมชาย ใจกล้า"},
    "67200367": {"password": "1234", "role": "student", "username": "67200367", "name": "นายสมชาย ใจกล้า"},
    "67200324": {"password": "Password1234!", "role": "student", "username": "67200324", "name": "Leo Ev (67200324)"},
    "6501234567": {"password": "1234", "role": "student", "username": "6501234567", "name": "นักศึกษา 6501234567"},
    "student_mori": {"password": "password4321", "role": "student", "username": "student_mori", "name": "Mori Kogoro"},
    "student_test": {"password": "Password1234!", "role": "student", "username": "student_test", "name": "นักศึกษา ทดสอบ"},
    "official_std": {"password": "testpass123", "role": "student", "username": "official_std", "name": "นักศึกษา บัญชีทางการ"},
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

    def resolve_name_from_db(self, username: str, role: str) -> Optional[str]:
        """ดึงชื่อจริงจาก MariaDB web_app หากมีข้อมูล"""
        try:
            from app.db.database import SessionLocal
            from app.models.models import WebAppLog
            db = SessionLocal()
            try:
                log = db.query(WebAppLog).filter(WebAppLog.student_id == username).order_by(WebAppLog.id.desc()).first()
                if log and log.student_name and log.student_name.strip():
                    return log.student_name.strip()
            finally:
                db.close()
        except Exception:
            pass
        return None

    def authenticate_user(
        self, username: str, password: str
    ) -> Dict[str, Any]:
        """
        ตรวจสอบตัวตนกับกลุ่ม 3 พร้อมดึงโปรไฟล์ผู้ใช้
        Returns dict:
            {
                "is_valid": bool,
                "role": str,
                "username": str,
                "name": str,
                "email": str,
                "external": bool
            }
        """
        # 1. พยายามยืนยันตัวตนกับ Central Auth Service ของกลุ่ม 3 เป็นลำดับแรก
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
                    role = None
                    verified_user = username
                    display_name = None

                    # ถอดรหัส Claims จาก JWT ของกลุ่ม 3
                    if token:
                        try:
                            decoded = jwt.decode(token, options={"verify_signature": False})
                            role = decoded.get("role")
                            verified_user = decoded.get("sub") or decoded.get("username") or username
                        except Exception:
                            pass

                        # เรียก /auth/me เพื่อขอข้อมูล Role และชื่อจริงจากกลุ่ม 3
                        try:
                            base_url = self.api_url.rsplit("/auth", 1)[0]
                            me_url = f"{base_url}/auth/me"
                            me_res = requests.get(
                                me_url,
                                headers={"Authorization": f"Bearer {token}"},
                                timeout=2.0,
                            )
                            if me_res.status_code == 200:
                                me_data = me_res.json()
                                if me_data.get("role"):
                                    role = me_data["role"]
                                if me_data.get("username"):
                                    verified_user = me_data["username"]
                                fname = me_data.get("first_name") or ""
                                lname = me_data.get("last_name") or ""
                                if fname or lname:
                                    display_name = f"{fname} {lname}".strip()
                        except Exception:
                            pass

                    # Fallback role ถ้ากลุ่ม 3 ไม่ได้ระบุ
                    if not role:
                        uname_lower = verified_user.lower()
                        if any(kw in uname_lower for kw in ["teacher", "ajarn", "instructor", "prof"]):
                            role = "teacher"
                        else:
                            role = "student"

                    # ค้นหาชื่อจริงจากฐานข้อมูลประวัติการแตะบัตร
                    if not display_name:
                        display_name = self.resolve_name_from_db(verified_user, role)

                    if not display_name:
                        if role == "teacher":
                            display_name = "อาจารย์ผู้สอน (Classroom Instructor)"
                        else:
                            display_name = f"นักศึกษา ({verified_user})"

                    email = f"{verified_user}@university.ac.th"

                    return {
                        "is_valid": True,
                        "role": role,
                        "username": verified_user,
                        "name": display_name,
                        "email": email,
                        "external": True,
                    }

            except Exception:
                # กรณีเชื่อมต่อกลุ่ม 3 ไม่ได้ หรือ Timeout จะปล่อยให้ Fallback ทำงานต่อ
                pass

        # 2. Mock Fallback (กรณีออฟไลน์ หรือบัญชีทดสอบที่กำหนดไว้)
        if self.mock_fallback and username in MOCK_ACCOUNTS:
            account = MOCK_ACCOUNTS[username]
            if account["password"] == password:
                role = account["role"]
                actual_user = account.get("username", username)
                display_name = account.get("name") or self.resolve_name_from_db(actual_user, role)
                if not display_name:
                    display_name = "อาจารย์ สมชาย ใจดี" if role == "teacher" else f"นักศึกษา ({actual_user})"

                return {
                    "is_valid": True,
                    "role": role,
                    "username": actual_user,
                    "name": display_name,
                    "email": f"{actual_user}@university.ac.th",
                    "external": False,
                }

        return {
            "is_valid": False,
            "role": None,
            "username": None,
            "name": None,
            "email": None,
            "external": False,
        }

    def verify_with_group3(
        self, username: str, password: str
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        res = self.authenticate_user(username, password)
        return res["is_valid"], res["role"], res["username"]

    def verify(self, username: str, password: str) -> Tuple[bool, Optional[str]]:
        res = self.authenticate_user(username, password)
        return res["is_valid"], res["role"]

    def authenticate(self, username: str, password: str) -> Tuple[bool, Optional[str], Optional[str]]:
        return self.verify_with_group3(username, password)


group3_client = Group3AuthClient()

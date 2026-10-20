import os
import requests
import jwt
from typing import Optional, Dict, Any, Tuple
from app.core.config import settings


class Group3AuthClient:
    """
    Client สำหรับเชื่อมต่อไปยัง Central Authentication Service (กลุ่ม 3)
    ตามข้อกำหนดของ Group 4 Member 4
    เฉพาะบัญชีที่ยืนยันตัวตนสำเร็จจากระบบกลางกลุ่ม 3 เท่านั้นที่จะสามารถเข้าสู่ระบบได้
    """

    def __init__(
        self,
        api_url: Optional[str] = None,
        timeout: Optional[float] = None,
    ):
        self.api_url = api_url if api_url is not None else settings.GROUP3_AUTH_URL
        self.timeout = timeout if timeout is not None else settings.GROUP3_TIMEOUT_SECONDS

    def is_external_configured(self) -> bool:
        """ตรวจสอบว่ามีการระบุ URL กลุ่ม 3 ภายนอกจริงหรือไม่"""
        if not self.api_url:
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
        ต้องผ่านการตรวจสอบจาก Group 3 API (http://192.168.100.103:8000/auth/login) เท่านั้น
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

                    # กำหนด role ถ้ากลุ่ม 3 ไม่ได้ระบุ
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
                            display_name = f"อาจารย์ ({verified_user})"
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
                pass

        # ไม่อนุญาตให้ล็อกอิน หากกลุ่ม 3 ไม่ตอบรับ หรือยืนยันตัวตนไม่ผ่าน
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

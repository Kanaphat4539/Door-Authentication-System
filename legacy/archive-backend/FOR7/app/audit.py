import logging
import threading
from typing import Optional
from sqlalchemy import text
from app.database import engine

logger = logging.getLogger("audit_logger")


def _execute_insert(username: str, action: str) -> bool:
    try:
        sql = text(
            "INSERT INTO user (username, action, timestamp) "
            "VALUES (:username, :action, NOW());"
        )
        with engine.begin() as conn:
            conn.execute(sql, {"username": username, "action": action})
        logger.info(f"✅ [Audit Log] Recorded: username='{username}', action='{action}'")
        return True
    except Exception as exc:
        logger.warning(
            f"⚠️ [Audit Log Warning] Failed to insert audit log "
            f"for '{username}' (action='{action}'): {exc}"
        )
        return False


def log_user_action(username: str, action: str, background: bool = True) -> bool:
    """
    [หน้าที่คนที่ 4 - Backend Auth & Security]
    บันทึก Audit Log พฤติกรรมการใช้งานหน้าเว็บลงตาราง user ตามสเปกของคนที่ 7

    คำสั่ง SQL:
        INSERT INTO user (username, action, timestamp)
        VALUES (:username, :action, NOW());

    รูปแบบตัวแปร :action:
        - ล็อกอิน: 'Login'
        - ค้นหารหัสนักศึกษา: 'Login>Search>Student'
        - เลือกกรองห้องเรียน: 'Search>room=LAB-401'

    หมายเหตุ:
        เขียนครอบด้วย try-except เพื่อไม่ให้กระทบการทำงานหลักของระบบ Auth
        กรณีบันทึก Log ไม่สำเร็จ (เช่น Database Offline หรือ Timeout)
    """
    if not username or not action:
        return False

    if background:
        thread = threading.Thread(
            target=_execute_insert,
            args=(username, action),
            daemon=True,
            name=f"audit-log-{username}",
        )
        thread.start()
        return True
    else:
        return _execute_insert(username, action)

import logging
import threading
from typing import Optional
from sqlalchemy import text
from app.db.database import engine

logger = logging.getLogger("audit_logger")


def _execute_insert(username: str, action: str, role: str = "teacher") -> bool:
    try:
        sql = text(
            "INSERT INTO user (timestamp, username, role, action) "
            "VALUES (NOW(), :username, :role, :action);"
        )
        with engine.begin() as conn:
            conn.execute(sql, {"username": username, "role": role, "action": action})
        logger.info(f"✅ [Audit Log] Recorded: username='{username}', role='{role}', action='{action}'")
        return True
    except Exception as exc:
        logger.warning(
            f"⚠️ [Audit Log Warning] Failed to insert audit log for '{username}' (role='{role}', action='{action}'): {exc}"
        )
        return False


def log_user_action(username: str, action: str, role: str = "teacher", background: bool = True) -> bool:
    """
    [หน้าที่คนที่ 4 - Backend Auth & Security]
    บันทึก Audit Log พฤติกรรมการใช้งานหน้าเว็บลงตาราง user ตามสเปกของคนที่ 7
    """
    if not username or not action:
        return False

    if background:
        thread = threading.Thread(
            target=_execute_insert,
            args=(username, action, role),
            daemon=True,
            name=f"audit-log-{username}",
        )
        thread.start()
        return True
    else:
        return _execute_insert(username, action, role)

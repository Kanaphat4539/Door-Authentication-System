import hashlib
import json
import logging
import os
from datetime import datetime
from typing import Dict, List, Set, Tuple, Optional
import requests
from sqlalchemy import text

from app.core.config import settings
from app.db.database import engine

logger = logging.getLogger("iot_sync")

STUDENT_ID_LENGTH = 8
MAX_STUDENT_NAME_LENGTH = 150
MAX_ROOM_LENGTH = 10
ALLOWED_STATUSES = {"IN", "OUT"}

# In-memory deduplication set
_processed_hashes: Set[str] = set()


def _compute_hash(timestamp: str, student_id: str, room: str, status: str) -> str:
    raw_str = f"{timestamp}_{student_id}_{room}_{status}"
    return hashlib.md5(raw_str.encode("utf-8")).hexdigest()


def validate_log_entry(entry: Dict[str, str]) -> Tuple[bool, Optional[str]]:
    """ตรวจสอบความถูกต้องของข้อมูลตาม Data Validation Rules ของคนที่ 5"""
    student_id = str(entry.get("student_id", "")).strip()
    student_name = str(entry.get("student_name", "")).strip()
    room = str(entry.get("room", "")).strip()
    status_val = str(entry.get("status", "")).strip().upper()
    ts = str(entry.get("timestamp", "")).strip()

    if not ts or not student_id or not student_name or not room or not status_val:
        return False, "ฟิลด์ข้อมูลไม่ครบถ้วน"

    if len(student_id) != STUDENT_ID_LENGTH:
        return False, f"รหัสนักศึกษาต้องมีความยาว {STUDENT_ID_LENGTH} หลัก"

    if len(student_name) > MAX_STUDENT_NAME_LENGTH:
        return False, f"ชื่อนักศึกษายาวเกิน {MAX_STUDENT_NAME_LENGTH} ตัวอักษร"

    if len(room) > MAX_ROOM_LENGTH:
        return False, f"รหัสห้องยาวเกิน {MAX_ROOM_LENGTH} ตัวอักษร"

    if status_val not in ALLOWED_STATUSES:
        return False, f"สถานะต้องเป็น IN หรือ OUT เท่านั้น (ได้รับ: {status_val})"

    return True, None


def ingest_logs(logs_data: List[Dict[str, str]]) -> Dict[str, int]:
    """
    ประมวลผล Ingestion Pipeline สำหรับบันทึกข้อมูล Logs จาก IoT (คนที่ 5)
    ทำการ Deduplicate, Validate และ Insert ลงในตาราง web_app
    """
    processed = 0
    inserted = 0
    skipped = 0

    insert_sql = text(
        "INSERT IGNORE INTO web_app (timestamp, student_id, student_name, room, status) "
        "VALUES (:timestamp, :student_id, :student_name, :room, :status)"
    )

    valid_entries = []
    for entry in logs_data:
        processed += 1
        is_valid, reason = validate_log_entry(entry)
        if not is_valid:
            logger.warning(f"⚠️ ข้อมูลไม่ผ่านการตรวจสอบ: {reason} -> {entry}")
            skipped += 1
            continue

        ts = entry["timestamp"]
        s_id = entry["student_id"]
        room = entry["room"]
        st = entry["status"].upper()

        h = _compute_hash(ts, s_id, room, st)
        if h in _processed_hashes:
            skipped += 1
            continue

        _processed_hashes.add(h)
        valid_entries.append({
            "timestamp": ts,
            "student_id": s_id,
            "student_name": entry["student_name"],
            "room": room,
            "status": st,
        })

    if valid_entries:
        try:
            with engine.begin() as conn:
                for item in valid_entries:
                    conn.execute(insert_sql, item)
                    inserted += 1
            logger.info(f"✅ บันทึกข้อมูล IoT ลง DB สำเร็จ {inserted} รายการ")
        except Exception as exc:
            logger.error(f"❌ เกิดข้อผิดพลาดในการบันทึก IoT Logs ลงฐานข้อมูล: {exc}")

    return {
        "processed_count": processed,
        "inserted_count": inserted,
        "skipped_count": skipped,
    }


def fetch_and_sync_iot_logs() -> Dict[str, int]:
    """
    ดึงข้อมูล (Pull) จากเซิร์ฟเวอร์ IoT ของกลุ่ม 6 ผ่าน HTTP GET
    """
    url = settings.IOT_LOG_URL
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                return ingest_logs(data)
            elif isinstance(data, dict) and "logs" in data:
                return ingest_logs(data["logs"])
    except Exception as exc:
        logger.warning(f"ไม่สามารถเชื่อมต่อไปยัง IoT Server ({url}): {exc}")

    return {"processed_count": 0, "inserted_count": 0, "skipped_count": 0}

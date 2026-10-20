import hashlib
import json
import logging
import os
from datetime import datetime
from typing import Dict, List, Set, Tuple, Optional, Any
import requests
from sqlalchemy import text

from app.core.config import settings
from app.db.database import engine

logger = logging.getLogger("iot_sync")

STUDENT_ID_LENGTH = 8
MAX_STUDENT_NAME_LENGTH = 150
MAX_ROOM_LENGTH = 10
ALLOWED_STATUSES = {"IN", "OUT"}

# In-memory deduplication set and synced logs cache
_processed_hashes: Set[str] = set()
_synced_logs: List[Dict[str, Any]] = []
_last_sync_info: Dict[str, Any] = {
    "last_sync_time": None,
    "target_url": settings.IOT_LOG_URL,
    "last_status": "idle",
    "total_synced": 0,
}

CACHE_FILE_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "synced_iot_logs.json")

_last_db_failure_time: float = 0.0
_DB_COOLDOWN_SECONDS: float = 60.0


def _compute_hash(timestamp: str, student_id: str, room: str, status: str) -> str:
    raw_str = f"{timestamp}_{student_id}_{room}_{status}"
    return hashlib.md5(raw_str.encode("utf-8")).hexdigest()


def _load_cached_logs() -> None:
    """โหลดประวัติ Logs ที่เคยดึงจาก IoT ที่บันทึกไว้ใน Local Cache"""
    global _synced_logs, _processed_hashes
    if os.path.exists(CACHE_FILE_PATH):
        try:
            with open(CACHE_FILE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    _synced_logs = data
                    for item in data:
                        h = _compute_hash(
                            item.get("timestamp", ""),
                            item.get("student_id", ""),
                            item.get("room", ""),
                            item.get("status", ""),
                        )
                        _processed_hashes.add(h)
                    _last_sync_info["total_synced"] = len(_synced_logs)
        except Exception as e:
            logger.warning(f"ไม่สามารถโหลดไฟล์ cache ได้: {e}")


def _save_cached_logs() -> None:
    """บันทึก Logs ที่ Sync แล้วลง Local Cache เพื่อรองรับ Fallback ขณะ DB ออฟไลน์"""
    try:
        os.makedirs(os.path.dirname(CACHE_FILE_PATH), exist_ok=True)
        with open(CACHE_FILE_PATH, "w", encoding="utf-8") as f:
            json.dump(_synced_logs, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"ไม่สามารถบันทึกไฟล์ cache ได้: {e}")


# โหลดแคชทันทีเมื่อเริ่มต้นโมดูล
_load_cached_logs()


def parse_access_log_line(line: str) -> Optional[Dict[str, str]]:
    """
    แปลง Log บรรทัดเดียวในรูปแบบ Pipe-delimited:
    [YYYY-MM-DD HH:mm:ss] | student_id | student_name | room | status
    """
    line = line.strip()
    if not line:
        return None

    parts = [part.strip() for part in line.split("|")]
    if len(parts) != 5:
        return None

    timestamp = parts[0].strip("[] \t")
    student_id = parts[1].strip()
    student_name = parts[2].strip()
    room = parts[3].strip()
    status = parts[4].strip().upper()

    try:
        datetime.strptime(timestamp, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None

    return {
        "timestamp": timestamp,
        "student_id": student_id,
        "student_name": student_name,
        "room": room,
        "status": status,
    }


def parse_raw_logs(content: str) -> List[Dict[str, str]]:
    """แปลงข้อความดิบหลายบรรทัดจากเซิร์ฟเวอร์ IoT ให้เป็น List of Dict"""
    parsed = []
    for line in content.strip().splitlines():
        item = parse_access_log_line(line)
        if item:
            parsed.append(item)
    return parsed


def validate_log_entry(entry: Dict[str, str]) -> Tuple[bool, Optional[str]]:
    """ตรวจสอบความถูกต้องของข้อมูลตาม Data Validation Rules ของคนที่ 5"""
    student_id = str(entry.get("student_id", "")).strip()
    student_name = str(entry.get("student_name", "")).strip()
    room = str(entry.get("room", "")).strip()
    status_val = str(entry.get("status", "")).strip().upper()
    ts = str(entry.get("timestamp", "")).strip()

    if not ts or not student_id or not student_name or not room or not status_val:
        return False, "ฟิลด์ข้อมูลไม่ครบถ้วน"

    if not student_id or len(student_id) > 20:
        return False, "รหัสผู้ใช้/นักศึกษาต้องมีความยาวไม่เกิน 20 ตัวอักษร"

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
    ทำการ Deduplicate, Validate และ Insert ลงในตาราง web_app (MariaDB)
    พร้อมกับบันทึกลงใน Synced Storage เพื่อใช้แสดงผลบนหน้าเว็บได้ทันที
    """
    global _synced_logs
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
        item_dict = {
            "id": len(_synced_logs) + len(valid_entries) + 1,
            "timestamp": ts,
            "student_id": s_id,
            "student_name": entry["student_name"],
            "room": room,
            "status": st,
        }
        valid_entries.append(item_dict)

    if valid_entries:
        # 1. พยายามบันทึกลง MariaDB หากฐานข้อมูลออนไลน์และไม่อยู่ในช่วง Cooldown
        global _last_db_failure_time
        import time as pytime
        db_cooling_down = (pytime.time() - _last_db_failure_time) < _DB_COOLDOWN_SECONDS

        if not db_cooling_down:
            try:
                with engine.begin() as conn:
                    for item in valid_entries:
                        conn.execute(
                            insert_sql,
                            {
                                "timestamp": item["timestamp"],
                                "student_id": item["student_id"],
                                "student_name": item["student_name"],
                                "room": item["room"],
                                "status": item["status"],
                            },
                        )
                        inserted += 1
                logger.info(f"✅ บันทึกข้อมูล IoT ลง MariaDB สำเร็จ {inserted} รายการ")
            except Exception as exc:
                _last_db_failure_time = pytime.time()
                logger.warning(f"⚠️ MariaDB ออฟไลน์หรือไม่สามารถเชื่อมต่อได้ ({exc}) จัดเก็บใน Local Synced Storage เพื่อแสดงบนหน้าเว็บ")
                inserted = len(valid_entries)
        else:
            inserted = len(valid_entries)

        # 2. อัปเดตลง Synced Storage เสมอ เพื่อให้หน้าเว็บดึงไปแสดงผลได้ทันที
        _synced_logs.extend(valid_entries)
        # เรียงลำดับตาม Timestamp ล่าสุดอยู่ด้านบน
        _synced_logs.sort(key=lambda x: str(x.get("timestamp", "")), reverse=True)
        _save_cached_logs()

    _last_sync_info["total_synced"] = len(_synced_logs)
    _last_sync_info["last_sync_time"] = datetime.now().isoformat()
    _last_sync_info["last_status"] = "success"

    return {
        "processed_count": processed,
        "inserted_count": inserted,
        "skipped_count": skipped,
        "synced_logs_count": len(_synced_logs),
    }


def fetch_and_sync_iot_logs(target_url: Optional[str] = None) -> Dict[str, Any]:
    """
    ดึงข้อมูล (Pull) จากเซิร์ฟเวอร์ IoT ผ่าน HTTP GET (รองรับทั้ง Plain text และ JSON)
    URL เริ่มต้น: settings.IOT_LOG_URL (เช่น http://172.16.10.200:3000/api/logs)
    พร้อม Fallback อัตโนมัติระหว่าง External NAT (172.16.10.200:3000) และ Private VM Network
    """
    candidate_urls = []
    if target_url:
        candidate_urls.append(target_url)
    else:
        candidate_urls.append(settings.IOT_LOG_URL)
        for fallback in [
            "http://192.168.100.106:3000/api/logs",
            "http://172.16.10.200:3000/api/logs",
            "http://192.168.100.106/api/logs",
        ]:
            if fallback not in candidate_urls:
                candidate_urls.append(fallback)

    last_error = ""
    for url in candidate_urls:
        _last_sync_info["target_url"] = url
        logger.info(f"🔄 กำลังดึงประวัติ Logs จาก IoT Server: {url}")

        try:
            response = requests.get(url, timeout=3)
            if response.status_code == 200:
                content_type = response.headers.get("Content-Type", "").lower()
                raw_text = response.text.strip()
                logs_list = []

                # กรณีที่ข้อมูลเป็น JSON
                if "application/json" in content_type or raw_text.startswith(("{", "[")):
                    try:
                        data = response.json()
                        if isinstance(data, list):
                            logs_list = data
                        elif isinstance(data, dict) and "logs" in data:
                            logs_list = data["logs"]
                    except Exception:
                        pass

                # กรณีที่ข้อมูลเป็น Pipe-delimited Text เช่น [2026-10-09 15:04:56] | 67200324 | Leo Ev | B317 | IN
                if not logs_list and ("|" in raw_text or "[" in raw_text):
                    logs_list = parse_raw_logs(raw_text)

                if logs_list:
                    result = ingest_logs(logs_list)
                    result["status"] = "success"
                    result["source_url"] = url
                    return result
                else:
                    logger.warning(f"⚠️ ไม่พบรูปแบบข้อมูล Logs ที่สามารถแปลงได้จาก {url}")
                    _last_sync_info["last_status"] = "no_logs_found"
            else:
                logger.warning(f"⚠️ IoT Server ส่งสถานะ HTTP {response.status_code}")
                _last_sync_info["last_status"] = f"http_error_{response.status_code}"

        except Exception as exc:
            last_error = str(exc)
            logger.warning(f"⚠️ ไม่สามารถเชื่อมต่อไปยัง IoT Server ({url}): {exc}")

    _last_sync_info["last_status"] = f"error: {last_error}" if last_error else "no_logs_found"
    return {
        "status": "error",
        "processed_count": 0,
        "inserted_count": 0,
        "skipped_count": 0,
        "synced_logs_count": len(_synced_logs),
        "source_url": candidate_urls[0],
    }


def get_synced_logs() -> List[Dict[str, Any]]:
    """คืนค่ารายการ Logs ทั้งหมดที่ดึงและประมวลผลมาจาก IoT"""
    return list(_synced_logs)


def get_last_sync_info() -> Dict[str, Any]:
    """คืนค่าข้อมูลสถานะและสถิติการซิงก์ IoT ล่าสุด"""
    info = dict(_last_sync_info)
    info["total_synced"] = len(_synced_logs)
    return info

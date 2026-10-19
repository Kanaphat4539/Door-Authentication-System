import logging
import time as pytime
from datetime import date, datetime, time, timedelta
from typing import Any, Dict, List, Optional
from sqlalchemy import text
from app.db.database import engine
from app.services.iot_service import get_synced_logs, fetch_and_sync_iot_logs

logger = logging.getLogger(__name__)

MOCK_LOGS: List[Dict[str, Any]] = [
    {"id": 1, "timestamp": "2026-10-14 15:30:12", "student_id": "65010234", "student_name": "นายธนภัทร สุขเกษม", "room": "B217", "status": "IN"},
    {"id": 2, "timestamp": "2026-10-14 15:15:28", "student_id": "65010567", "student_name": "นางสาวสมหญิง ตั้งใจ", "room": "E107", "status": "OUT"},
    {"id": 3, "timestamp": "2026-10-14 14:50:05", "student_id": "66010892", "student_name": "นายกิตติศักดิ์ ประเสริฐ", "room": "B218", "status": "IN"},
    {"id": 4, "timestamp": "2026-10-14 14:40:50", "student_id": "64010111", "student_name": "นายปิติ มั่นคง", "room": "B316", "status": "IN"},
    {"id": 5, "timestamp": "2026-10-14 14:25:19", "student_id": "65010999", "student_name": "นางสาวมณีรัตน์ แสงแก้ว", "room": "E111", "status": "OUT"},
    {"id": 6, "timestamp": "2026-10-14 14:10:02", "student_id": "65010345", "student_name": "นายชินวัตร บุญสม", "room": "B217", "status": "IN"},
    {"id": 7, "timestamp": "2026-10-14 13:50:41", "student_id": "66010777", "student_name": "นายวรพจน์ ศรีสุวรรณ", "room": "B317", "status": "OUT"},
    {"id": 8, "timestamp": "2026-10-14 13:30:03", "student_id": "65010888", "student_name": "นางสาวพิมพ์ชนก รุ่งเรือง", "room": "E112", "status": "IN"},
    {"id": 9, "timestamp": "2026-10-14 13:15:15", "student_id": "64010555", "student_name": "นายอนุชา วงศ์สวัสดิ์", "room": "B113", "status": "IN"},
    {"id": 10, "timestamp": "2026-10-14 12:55:44", "student_id": "65010666", "student_name": "นางสาวนภัสสร ใจดี", "room": "B218", "status": "OUT"},
    {"id": 11, "timestamp": "2026-10-14 12:30:20", "student_id": "65010444", "student_name": "นายธีรภัทร ชาญวิทย์", "room": "B217", "status": "IN"},
    {"id": 12, "timestamp": "2026-10-14 12:05:06", "student_id": "66010222", "student_name": "นางสาวศิริพร บุญตา", "room": "E107", "status": "OUT"},
]

THAI_MONTHS = (
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
)

ROOM_SUB_MAP = {
    "B217": "Building B / Floor 2",
    "B218": "Building B / Floor 2",
    "B316": "Building B / Floor 3",
    "B317": "Building B / Floor 3",
    "E107": "Building E / Floor 1",
    "E111": "Building E / Floor 1",
    "E112": "Building E / Floor 1",
    "B113": "Building B / Floor 1",
    "LAB-401": "Building 4 / Lab Room",
    "SMART-205": "Building 2 / Smart Room",
}

# Circuit breaker สำหรับ MariaDB เมื่อออฟไลน์
_last_db_failure_time: float = 0.0
_DB_COOLDOWN_SECONDS: float = 60.0


def _as_datetime(value: datetime | str) -> datetime:
    if isinstance(value, datetime):
        return value
    clean_val = str(value).strip().strip("[]")
    return datetime.strptime(clean_val, "%Y-%m-%d %H:%M:%S")


def _format_log(log: Dict[str, Any], lang: str) -> Dict[str, Any]:
    timestamp = _as_datetime(log["timestamp"])
    student_id = str(log["student_id"])
    student_name = str(log["student_name"])
    room = str(log["room"])
    room_sub = ROOM_SUB_MAP.get(room, f"Room {room}")

    if lang == "th":
        displayed_date = f"{timestamp.day} {THAI_MONTHS[timestamp.month - 1]} {timestamp.year + 543}"
        displayed_time = f"{timestamp:%H:%M} น."
    else:
        displayed_date = timestamp.strftime("%b %d, %Y")
        displayed_time = timestamp.strftime("%I:%M %p").lstrip("0")

    return {
        "id": log.get("id", student_id),
        "student_id": student_id,
        "name": student_name,
        "student_name": student_name,
        "room": room,
        "roomSub": room_sub,
        "date": displayed_date,
        "time": displayed_time,
        "status": str(log["status"]).upper(),
    }


def _matches(
    log: Dict[str, Any],
    student_id: Optional[str],
    room: Optional[str],
    selected_date: Optional[date],
    time_slot: Optional[str],
    status: Optional[str],
) -> bool:
    timestamp = _as_datetime(log["timestamp"])
    if student_id:
        kw = student_id.casefold()
        combined = f"{str(log['student_id']).casefold()} {str(log['student_name']).casefold()}"
        if kw not in combined:
            return False
    if room and room != "all" and room.casefold() != str(log["room"]).casefold():
        return False
    if selected_date and timestamp.date() != selected_date:
        return False
    if time_slot and time_slot != "all":
        slot_clean = time_slot.split("-")[0].strip() if "-" in time_slot else time_slot
        try:
            slot_start = time.fromisoformat(slot_clean)
            slot_end = (datetime.combine(date.min, slot_start) + timedelta(hours=1)).time()
            if timestamp.time() < slot_start or (slot_start.hour < 23 and timestamp.time() >= slot_end):
                return False
        except ValueError:
            pass
    if status and status != "all" and str(log["status"]).upper() != status.upper():
        return False
    return True


def get_all_available_logs() -> List[Dict[str, Any]]:
    """รวบรวม Logs ที่ซิงก์มาจาก IoT หากยังไม่มีให้พยายาม Pull อัตโนมัติ"""
    synced = get_synced_logs()
    if not synced:
        try:
            fetch_and_sync_iot_logs()
            synced = get_synced_logs()
        except Exception:
            pass
    if synced:
        return synced
    return MOCK_LOGS


def _filtered_mock(
    student_id: Optional[str],
    room: Optional[str],
    selected_date: Optional[date],
    time_slot: Optional[str],
    status: Optional[str],
) -> List[Dict[str, Any]]:
    base_logs = get_all_available_logs()
    return sorted(
        [log for log in base_logs if _matches(log, student_id, room, selected_date, time_slot, status)],
        key=lambda item: _as_datetime(item["timestamp"]),
        reverse=True,
    )


def get_dashboard_data(
    student_id: Optional[str] = None,
    room: Optional[str] = None,
    selected_date: Optional[date] = None,
    time_slot: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 10,
    lang: str = "th",
) -> Dict[str, Any]:
    """
    ดึงข้อมูลประวัติการเข้า-ออกห้องเรียนและสถิติภาพรวม (Member 6)
    พยายามเชื่อมต่อฐานข้อมูล MariaDB/MySQL ก่อน หากเชื่อมต่อไม่ได้จะดึงข้อมูล IoT Logs ที่ซิงก์ไว้มาแสดงผล
    """
    global _last_db_failure_time
    total = 0
    raw_logs = []
    active_rooms = 0
    total_access = 0
    used_db = False

    # ตรวจสอบว่า MariaDB อยู่ในช่วง Cooldown หรือไม่
    now_time = pytime.time()
    db_cooling_down = (now_time - _last_db_failure_time) < _DB_COOLDOWN_SECONDS

    if not db_cooling_down:
        try:
            where_clauses = ["1=1"]
            params = {}

            if student_id:
                where_clauses.append("(student_id LIKE :kw OR student_name LIKE :kw)")
                params["kw"] = f"%{student_id}%"
            if room and room != "all":
                where_clauses.append("room = :room")
                params["room"] = room
            if selected_date:
                where_clauses.append("DATE(timestamp) = :sel_date")
                params["sel_date"] = selected_date
            if time_slot and time_slot != "all":
                slot_clean = time_slot.split("-")[0].strip() if "-" in time_slot else time_slot
                if slot_clean.startswith("23:"):
                    where_clauses.append("TIME(timestamp) >= :slot_start AND TIME(timestamp) <= '23:59:59'")
                else:
                    where_clauses.append("TIME(timestamp) >= :slot_start AND TIME(timestamp) < ADDTIME(:slot_start, '01:00:00')")
                params["slot_start"] = slot_clean
            if status and status != "all":
                where_clauses.append("status = :status")
                params["status"] = status

            where_sql = " AND ".join(where_clauses)
            offset = (page - 1) * limit

            with engine.connect() as conn:
                count_query = text(f"SELECT COUNT(*) FROM web_app WHERE {where_sql}")
                total = conn.execute(count_query, params).scalar() or 0

                query_sql = text(
                    f"SELECT id, timestamp, student_id, student_name, room, status "
                    f"FROM web_app WHERE {where_sql} "
                    f"ORDER BY timestamp DESC LIMIT :limit OFFSET :offset"
                )
                query_params = {**params, "limit": limit, "offset": offset}
                result = conn.execute(query_sql, query_params)
                for row in result:
                    raw_logs.append({
                        "id": row.id,
                        "timestamp": row.timestamp,
                        "student_id": row.student_id,
                        "student_name": row.student_name,
                        "room": row.room,
                        "status": row.status,
                    })

                stat_query = text("SELECT COUNT(DISTINCT room) FROM web_app WHERE status = 'IN' AND DATE(timestamp) = CURDATE()")
                active_rooms = conn.execute(stat_query).scalar() or 0

                access_query = text("SELECT COUNT(*) FROM web_app WHERE DATE(timestamp) = CURDATE()")
                total_access = conn.execute(access_query).scalar() or total
                used_db = True

        except Exception as exc:
            _last_db_failure_time = pytime.time()
            logger.info(f"MariaDB connection not active, using IoT synced logs cache: {exc}")

    # หากไม่ได้ใช้ MariaDB หรือไม่มีข้อมูลใน DB ให้ดึงข้อมูลจาก Synced IoT Storage
    if not used_db or (total == 0 and len(raw_logs) == 0):
        all_filtered = _filtered_mock(student_id, room, selected_date, time_slot, status)
        total = len(all_filtered)
        start = (page - 1) * limit
        end = start + limit
        raw_logs = all_filtered[start:end]

        in_rooms = {l["room"] for l in all_filtered if str(l.get("status", "")).upper() == "IN"}
        active_rooms = len(in_rooms)
        total_access = total

    total_pages = max(1, (total + limit - 1) // limit) if total > 0 else 1
    formatted_logs = [_format_log(l, lang) for l in raw_logs]

    return {
        "status": "success",
        "activeRooms": active_rooms,
        "totalAccess": total_access,
        "totalRooms": 8,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "totalPages": total_pages,
        },
        "logs": formatted_logs,
        "data": formatted_logs,
    }

import logging
import time as pytime
from datetime import date, datetime, time, timedelta
from typing import Any, Dict, List, Optional
from sqlalchemy import text
from app.db.database import engine
from app.services.iot_service import get_synced_logs, fetch_and_sync_iot_logs

logger = logging.getLogger(__name__)

MOCK_LOGS: List[Dict[str, Any]] = []

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
    owner_student_id: Optional[str] = None,
) -> bool:
    if owner_student_id:
        target_owner = str(owner_student_id).strip().casefold()
        log_std = str(log.get("student_id", "")).strip().casefold()
        if log_std != target_owner and target_owner not in log_std:
            return False
    timestamp = _as_datetime(log["timestamp"])
    if student_id:
        kw = str(student_id).strip().casefold()
        std_id_str = str(log.get('student_id', '')).strip().casefold()
        if kw not in std_id_str:
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
    """รวบรวม Logs ที่ซิงก์มาจาก IoT ร่วมกับ Mock Dataset"""
    synced = get_synced_logs()
    if not synced:
        try:
            fetch_and_sync_iot_logs()
            synced = get_synced_logs()
        except Exception:
            pass
    if synced:
        return synced
    return []


def _filtered_mock(
    student_id: Optional[str],
    room: Optional[str],
    selected_date: Optional[date],
    time_slot: Optional[str],
    status: Optional[str],
    owner_student_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    base_logs = get_all_available_logs()
    status_clean = str(status).strip().upper() if status else None
    if status_clean in ("ACTIVE", "CURRENT", "IN_USE"):
        latest_by_student = {}
        for l in sorted(base_logs, key=lambda x: _as_datetime(x["timestamp"])):
            latest_by_student[l["student_id"]] = l
        active_latest = [l for l in latest_by_student.values() if str(l.get("status", "")).upper() == "IN"]
        return sorted(
            [log for log in active_latest if _matches(log, student_id, room, selected_date, time_slot, None, owner_student_id)],
            key=lambda item: _as_datetime(item["timestamp"]),
            reverse=True,
        )
    return sorted(
        [log for log in base_logs if _matches(log, student_id, room, selected_date, time_slot, status, owner_student_id)],
        key=lambda item: _as_datetime(item["timestamp"]),
        reverse=True,
    )


def get_dashboard_data(
    student_id: Optional[str] = None,
    owner_student_id: Optional[str] = None,
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
    รองรับทั้งอาจารย์ (ค้นหาได้ทุกคน) และนักศึกษา (owner_student_id ล็อกเฉพาะตนเอง ป้องกัน IDOR)
    """
    global _last_db_failure_time
    total = 0
    raw_logs = []
    active_rooms = 0
    total_access = 0
    used_db = False

    # ดึงข้อมูลล่าสุดจาก Group 6 IoT Server เสมอ เพื่อให้การเข้าห้องอัปเดตแบบ Real-time
    try:
        fetch_and_sync_iot_logs()
    except Exception:
        pass

    # ตรวจสอบว่า MariaDB อยู่ในช่วง Cooldown หรือไม่
    now_time = pytime.time()
    db_cooling_down = (now_time - _last_db_failure_time) < _DB_COOLDOWN_SECONDS

    if not db_cooling_down:
        try:
            where_clauses = ["1=1"]
            params = {}

            # หากระบุ owner_student_id (นักศึกษา) ให้ล็อกเฉพาะรหัสของตนเอง ป้องกัน IDOR
            if owner_student_id:
                where_clauses.append("student_id = :owner_id")
                params["owner_id"] = owner_student_id
            elif student_id:
                where_clauses.append("student_id LIKE :kw")
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
            status_clean = str(status).strip().upper() if status else None
            if status_clean and status_clean != "ALL":
                if status_clean in ("ACTIVE", "CURRENT", "IN_USE"):
                    where_clauses.append("id IN (SELECT MAX(id) FROM web_app GROUP BY student_id) AND status = 'IN'")
                else:
                    where_clauses.append("status = :status")
                    params["status"] = status_clean


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

                # -------------------------------------------------------------------------
                # การ์ดสรุปสถิติ (Stat Cards): แสดงข้อมูลภาพรวมทั้งหมดตามบทบาท ไม่ลดทอนตามการค้นหา
                # - บทบาทอาจารย์: แสดงข้อมูลทั้งหมดของทั้งระบบ
                #   Card 1 (activeRooms): ห้องที่มีการใช้ทั้งหมดกี่ห้อง
                #   Card 2 (totalAccess): สถิติการเข้าใช้ห้องเรียนรายวันทั้งหมดของระบบ
                # - บทบาทนักศึกษา: แสดงข้อมูลทั้งหมดเฉพาะของตนเอง (ไม่ลดทอนตามการค้นหา)
                #   Card 1 (activeRooms): ห้องที่ตนเองเคยเข้าใช้งานทั้งหมดกี่ห้อง
                #   Card 2 (totalAccess): สถิติการเข้าใช้ห้องเรียนของตนเองทั้งหมด
                # -------------------------------------------------------------------------
                if owner_student_id:
                    stat_scope_where = "student_id = :stat_owner_id"
                    stat_scope_params = {"stat_owner_id": owner_student_id}
                else:
                    stat_scope_where = "1=1"
                    stat_scope_params = {}

                # 1. ห้องที่มีการใช้ทั้งหมดกี่ห้อง
                room_stat_query = text(f"SELECT COUNT(DISTINCT room) FROM web_app WHERE {stat_scope_where}")
                active_rooms = conn.execute(room_stat_query, stat_scope_params).scalar() or 0

                # 2. สถิติการเข้าใช้ห้องเรียนรายวัน
                today_stat_query = text(f"SELECT COUNT(*) FROM web_app WHERE {stat_scope_where} AND DATE(timestamp) = CURDATE()")
                daily_count = conn.execute(today_stat_query, stat_scope_params).scalar() or 0
                if daily_count > 0:
                    total_access = daily_count
                else:
                    latest_day_query = text(
                        f"SELECT COUNT(*) FROM web_app WHERE {stat_scope_where} "
                        f"AND DATE(timestamp) = (SELECT MAX(DATE(timestamp)) FROM web_app WHERE {stat_scope_where})"
                    )
                    latest_count = conn.execute(latest_day_query, stat_scope_params).scalar() or 0
                    total_access = latest_count if latest_count > 0 else (conn.execute(text(f"SELECT COUNT(*) FROM web_app WHERE {stat_scope_where}"), stat_scope_params).scalar() or 0)

                used_db = True

        except Exception as exc:
            _last_db_failure_time = pytime.time()
            logger.info(f"MariaDB connection not active, using IoT synced logs cache: {exc}")

    # หากไม่ได้ใช้ MariaDB (Connection ล้มเหลว) ให้ดึงข้อมูลจาก Synced IoT Storage
    if not used_db:
        base_logs = get_all_available_logs()

        # กำหนด Scope ข้อมูลตามบทบาท (ไม่ขึ้นกับฟิลเตอร์การค้นหา)
        if owner_student_id:
            user_scope_logs = [l for l in base_logs if str(l.get("student_id", "")).strip().casefold() == str(owner_student_id).strip().casefold()]
        else:
            user_scope_logs = base_logs

        # 1. ห้องที่มีการใช้ทั้งหมดกี่ห้อง
        scope_rooms = {l["room"] for l in user_scope_logs if l.get("room")}
        active_rooms = len(scope_rooms)

        # 2. สถิติการเข้าใช้ห้องเรียนรายวัน
        today_date = date.today()
        today_logs = [l for l in user_scope_logs if _as_datetime(l["timestamp"]).date() == today_date]
        if today_logs:
            total_access = len(today_logs)
        else:
            total_access = len(user_scope_logs)

        # ส่วนตารางรายการให้กรองตามเงื่อนไขการค้นหาตามปกติ
        all_filtered = _filtered_mock(student_id, room, selected_date, time_slot, status, owner_student_id)
        total = len(all_filtered)
        start = (page - 1) * limit
        end = start + limit
        raw_logs = all_filtered[start:end]

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

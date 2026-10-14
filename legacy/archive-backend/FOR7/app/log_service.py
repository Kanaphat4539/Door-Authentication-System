import logging
import os
from datetime import date, datetime, time, timedelta
from typing import Any

import pymysql
from fastapi import HTTPException
from pymysql.cursors import DictCursor

logger = logging.getLogger(__name__)

MOCK_LOGS: list[dict[str, Any]] = [
    {"id": 1, "timestamp": "2024-10-24 10:45:12", "student_id": "65010234", "student_name": "Thanaphat Sukhasem", "room": "LAB-401", "status": "IN"},
    {"id": 2, "timestamp": "2024-10-24 10:44:28", "student_id": "65010891", "student_name": "Pimchanok Suwannawetch", "room": "SMART-205", "status": "OUT"},
    {"id": 3, "timestamp": "2024-10-24 10:41:05", "student_id": "64010512", "student_name": "Kittikhun Chantrakul", "room": "STUDIO-101", "status": "IN"},
    {"id": 4, "timestamp": "2024-10-24 10:38:50", "student_id": "66011409", "student_name": "Ramita Narithachot", "room": "LECTURE-302", "status": "IN"},
    {"id": 5, "timestamp": "2024-10-24 10:35:19", "student_id": "65010442", "student_name": "Worapat Ekpreecha", "room": "LAB-401", "status": "OUT"},
    {"id": 6, "timestamp": "2024-10-24 10:30:02", "student_id": "64010998", "student_name": "Chonthicha Rattanawongsa", "room": "SMART-205", "status": "IN"},
    {"id": 7, "timestamp": "2024-10-24 09:58:41", "student_id": "65010234", "student_name": "Thanaphat Sukhasem", "room": "LAB-401", "status": "OUT"},
    {"id": 8, "timestamp": "2024-10-24 09:50:03", "student_id": "66012001", "student_name": "Nattaya Kanjana", "room": "LECTURE-302", "status": "IN"},
    {"id": 9, "timestamp": "2024-10-24 09:22:15", "student_id": "64010512", "student_name": "Kittikhun Chantrakul", "room": "STUDIO-101", "status": "OUT"},
    {"id": 10, "timestamp": "2024-10-24 08:55:44", "student_id": "65010891", "student_name": "Pimchanok Suwannawetch", "room": "SMART-205", "status": "IN"},
    {"id": 11, "timestamp": "2024-10-23 15:14:20", "student_id": "65010442", "student_name": "Worapat Ekpreecha", "room": "LAB-401", "status": "IN"},
    {"id": 12, "timestamp": "2024-10-23 14:03:06", "student_id": "66011409", "student_name": "Ramita Narithachot", "room": "LECTURE-302", "status": "OUT"},
]

THAI_MONTHS = (
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
)


def _as_datetime(value: datetime | str) -> datetime:
    if isinstance(value, datetime):
        return value
    return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")


def _matches(
    log: dict[str, Any],
    student_id: str | None,
    room: str | None,
    selected_date: date | None,
    time_slot: str | None,
    status: str | None,
) -> bool:
    timestamp = _as_datetime(log["timestamp"])
    if student_id and student_id.casefold() not in (
        str(log["student_id"]).casefold() + " " + str(log["student_name"]).casefold()
    ):
        return False
    if room and room.casefold() != str(log["room"]).casefold():
        return False
    if selected_date and timestamp.date() != selected_date:
        return False
    if time_slot:
        slot_start = time.fromisoformat(time_slot)
        slot_end = (datetime.combine(date.min, slot_start) + timedelta(hours=1)).time()
        if timestamp.time() < slot_start or (slot_start.hour < 23 and timestamp.time() >= slot_end):
            return False
    if status and log["status"] != status:
        return False
    return True


def _format_log(log: dict[str, Any], lang: str) -> dict[str, Any]:
    timestamp = _as_datetime(log["timestamp"])
    student_id = str(log["student_id"])
    student_name = str(log["student_name"])
    if lang == "th":
        displayed_date = f"{timestamp.day} {THAI_MONTHS[timestamp.month - 1]} {timestamp.year + 543}"
        displayed_time = f"{timestamp:%H:%M} น."
    else:
        displayed_date = timestamp.strftime("%b %d, %Y")
        displayed_time = timestamp.strftime("%I:%M %p").lstrip("0")
    return {
        "id": student_id,
        "student_id": student_id,
        "name": student_name,
        "student_name": student_name,
        "room": str(log["room"]),
        "roomSub": "",
        "date": displayed_date,
        "time": displayed_time,
        "status": str(log["status"]),
    }


def _filtered_mock(
    student_id: str | None,
    room: str | None,
    selected_date: date | None,
    time_slot: str | None,
    status: str | None,
) -> list[dict[str, Any]]:
    return sorted(
        (
            log for log in MOCK_LOGS
            if _matches(log, student_id, room, selected_date, time_slot, status)
        ),
        key=lambda log: (_as_datetime(log["timestamp"]), int(log["id"])),
        reverse=True,
    )


def _database_connection() -> pymysql.connections.Connection:
    required = ("DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD")
    missing = [name for name in required if not os.getenv(name)]
    if missing:
        raise HTTPException(
            status_code=503,
            detail=f"MariaDB configuration is missing: {', '.join(missing)}",
        )
    try:
        return pymysql.connect(
            host=os.environ["DB_HOST"],
            port=int(os.getenv("DB_PORT", "3306")),
            database=os.environ["DB_NAME"],
            user=os.environ["DB_USER"],
            password=os.environ["DB_PASSWORD"],
            charset="utf8mb4",
            cursorclass=DictCursor,
            connect_timeout=5,
        )
    except (pymysql.MySQLError, ValueError) as error:
        logger.exception("Unable to connect to configured MariaDB")
        raise HTTPException(status_code=503, detail="Unable to connect to MariaDB") from error


def _query_database(
    student_id: str | None,
    room: str | None,
    selected_date: date | None,
    time_slot: str | None,
    status: str | None,
    page: int,
    limit: int,
) -> tuple[list[dict[str, Any]], int, int, int]:
    conditions: list[str] = []
    params: list[Any] = []
    if student_id:
        conditions.append("(student_id LIKE %s OR student_name LIKE %s)")
        params.extend((f"%{student_id}%", f"%{student_id}%"))
    if room:
        conditions.append("room = %s")
        params.append(room)
    if selected_date:
        conditions.append("DATE(timestamp) = %s")
        params.append(selected_date)
    if time_slot:
        conditions.append("TIME(timestamp) >= %s AND TIME(timestamp) < %s")
        slot_start = time.fromisoformat(time_slot)
        slot_end = (datetime.combine(date.min, slot_start) + timedelta(hours=1)).time()
        if slot_start.hour == 23:
            conditions[-1] = "TIME(timestamp) >= %s"
            params.append(slot_start)
        else:
            params.extend((slot_start, slot_end))
    if status:
        conditions.append("status = %s")
        params.append(status)

    where_clause = f" WHERE {' AND '.join(conditions)}" if conditions else ""
    connection = _database_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*) AS total FROM web_app{where_clause}", params)
            total = int(cursor.fetchone()["total"])

            cursor.execute(
                "SELECT id, timestamp, student_id, student_name, room, status "
                f"FROM web_app{where_clause} "
                "ORDER BY timestamp DESC, id DESC LIMIT %s OFFSET %s",
                [*params, limit, (page - 1) * limit],
            )
            logs = cursor.fetchall()

            cursor.execute(
                "SELECT COUNT(DISTINCT room) AS active_rooms, COUNT(*) AS total_access "
                "FROM web_app WHERE DATE(timestamp) = CURDATE()"
            )
            stats = cursor.fetchone()
            return logs, total, int(stats["active_rooms"]), int(stats["total_access"])
    except pymysql.MySQLError as error:
        logger.exception("MariaDB query failed for access-log request")
        raise HTTPException(status_code=503, detail="MariaDB query failed") from error
    finally:
        connection.close()


def get_dashboard_data(
    student_id: str | None,
    room: str | None,
    selected_date: date | None,
    time_slot: str | None,
    status: str | None,
    page: int,
    limit: int,
    lang: str,
) -> dict[str, Any]:
    if os.getenv("DATA_SOURCE", "mock").casefold() == "mariadb":
        logs, total, active_rooms, total_access = _query_database(
            student_id, room, selected_date, time_slot, status, page, limit
        )
    elif os.getenv("DATA_SOURCE", "mock").casefold() == "mock":
        all_today = [log for log in MOCK_LOGS if _as_datetime(log["timestamp"]).date() == date.today()]
        if not all_today:
            all_today = MOCK_LOGS
        filtered = _filtered_mock(student_id, room, selected_date, time_slot, status)
        total = len(filtered)
        start_index = (page - 1) * limit
        logs = filtered[start_index : start_index + limit]
        active_rooms = len({log["room"] for log in all_today})
        total_access = len(all_today)
    else:
        raise HTTPException(status_code=500, detail="DATA_SOURCE must be 'mock' or 'mariadb'")

    return {
        "status": "success",
        "activeRooms": active_rooms,
        "totalAccess": total_access,
        "logs": [_format_log(log, lang) for log in logs],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "totalPages": (total + limit - 1) // limit,
        },
    }

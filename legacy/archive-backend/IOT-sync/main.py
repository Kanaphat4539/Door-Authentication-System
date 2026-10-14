import hashlib
import json
import logging
from logging.handlers import RotatingFileHandler
import os
import time
from datetime import datetime
from typing import Optional, Set, Tuple

from dotenv import load_dotenv
import pymysql
import requests

# ------------------------------------------------------------------------------
# Configuration & Constants
# ------------------------------------------------------------------------------
load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASS", "")
DB_NAME = os.getenv("DB_NAME", "web_app_db")
DB_TABLE_NAME = os.getenv("DB_TABLE_NAME", "web_app")

IOT_LOG_URL = os.getenv("IOT_LOG_URL", "http://192.168.100.106/api/logs")
POLL_INTERVAL_SECONDS = int(os.getenv("POLL_INTERVAL_SECONDS", "20"))
REQUEST_TIMEOUT_SECONDS = 5

DEBOUNCE_INTERVAL_SECONDS = 10
STUDENT_ID_LENGTH = 8
MAX_STUDENT_NAME_LENGTH = 150
MAX_ROOM_LENGTH = 10
ALLOWED_STATUSES = {"IN", "OUT"}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATE_FILE = os.path.join(BASE_DIR, "state.txt")
LOG_FILE_NAME = os.getenv("LOG_FILE", "iot_sync.log")
LOG_FILE_PATH = os.path.join(BASE_DIR, LOG_FILE_NAME)


# ------------------------------------------------------------------------------
# Logger Setup
# ------------------------------------------------------------------------------
def setup_logger() -> logging.Logger:
    """Configures and returns the application logger with console and file output."""
    app_logger = logging.getLogger("IOT_Sync")
    app_logger.setLevel(logging.INFO)

    if not app_logger.handlers:
        formatter = logging.Formatter(
            "[%(asctime)s] [%(levelname)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        app_logger.addHandler(console_handler)

        file_handler = RotatingFileHandler(
            LOG_FILE_PATH,
            maxBytes=5 * 1024 * 1024,
            backupCount=3,
            encoding="utf-8",
        )
        file_handler.setFormatter(formatter)
        app_logger.addHandler(file_handler)

    return app_logger


logger = setup_logger()


# ------------------------------------------------------------------------------
# State Persistence Helpers
# ------------------------------------------------------------------------------
def get_processed_line_hashes() -> Set[str]:
    """Loads previously processed log line hashes from the state file."""
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as file:
                stored_hashes = json.load(file)
            if isinstance(stored_hashes, list):
                return set(stored_hashes)
        except (OSError, json.JSONDecodeError):
            logger.warning("ไม่สามารถอ่าน state.txt ได้ หรือไฟล์ยังว่างเปล่า เริ่มต้นด้วยเซ็ตว่าง")
    return set()


def save_processed_line_hashes(line_hashes: Set[str]) -> None:
    """Persists processed log line hashes back to the state file."""
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as file:
            json.dump(sorted(line_hashes), file)
    except OSError as err:
        logger.error(f"ไม่สามารถบันทึก state.txt ได้: {err}")


# ------------------------------------------------------------------------------
# Data Parsing & Validation
# ------------------------------------------------------------------------------
def parse_access_log_line(line: str) -> Optional[Tuple[str, str, str, str, str]]:
    """Parses and validates a single pipe-delimited access log line.

    Expected format: [YYYY-MM-DD HH:mm:ss] | student_id | student_name | room | status

    Returns:
        A tuple of (timestamp, student_id, student_name, room, status) if valid,
        or None if parsing/validation fails.
    """
    parts = [part.strip() for part in line.split("|")]
    if len(parts) != 5:
        return None

    timestamp, student_id, student_name, room, status = parts
    timestamp = timestamp.strip("[]")

    try:
        datetime.strptime(timestamp, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None

    if (
        len(student_id) != STUDENT_ID_LENGTH
        or not student_id.isdigit()
        or not student_name
        or len(student_name) > MAX_STUDENT_NAME_LENGTH
        or not room
        or len(room) > MAX_ROOM_LENGTH
        or status not in ALLOWED_STATUSES
    ):
        return None

    return timestamp, student_id, student_name, room, status


# ------------------------------------------------------------------------------
# Core Synchronization Logic
# ------------------------------------------------------------------------------
def sync_logs() -> None:
    """Fetches raw logs from IoT server, filters duplicates, and saves new entries to MySQL."""
    conn = None
    cursor = None
    try:
        response = requests.get(IOT_LOG_URL, timeout=REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()

        lines = [line for line in response.text.strip().split("\n") if line.strip()]
        if not lines:
            logger.info("ตรวจสอบข้อมูล: ไม่พบ Log จาก IoT Server ในขณะนี้")
            return

        processed_line_hashes = get_processed_line_hashes()

        # กรองเฉพาะบรรทัดที่ยังไม่เคยประมวลผล
        unprocessed_lines = []
        for line in lines:
            line_hash = hashlib.sha256(line.strip().encode("utf-8")).hexdigest()
            if line_hash not in processed_line_hashes:
                unprocessed_lines.append((line_hash, line))

        if not unprocessed_lines:
            logger.info("ตรวจสอบข้อมูล: ไม่มีรายการใหม่ที่ต้องประมวลผล")
            return

        # เชื่อมต่อ MySQL เฉพาะเมื่อมีรายการใหม่ที่ต้องตรวจสอบและบันทึก
        conn = pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME,
            charset="utf8mb4",
        )
        cursor = conn.cursor()

        new_records_count = 0
        invalid_format_count = 0
        skipped_duplicate_count = 0

        # ป้องกัน SQL injection ในชื่อตารางด้วย identifier validation
        sanitized_table = f"`{DB_TABLE_NAME}`" if DB_TABLE_NAME.isidentifier() else "`web_app`"

        recent_record_query = f"""
            SELECT COUNT(*)
            FROM {sanitized_table}
            WHERE student_id = %s
                AND room = %s
                AND status = %s
                AND timestamp BETWEEN DATE_SUB(%s, INTERVAL %s SECOND) AND %s
        """

        insert_query = f"""
            INSERT IGNORE INTO {sanitized_table} (timestamp, student_id, student_name, room, status)
            VALUES (%s, %s, %s, %s, %s)
        """

        for line_hash, line in unprocessed_lines:
            record = parse_access_log_line(line)
            if record is None:
                invalid_format_count += 1
                logger.warning(f"ข้ามบรรทัดที่รูปแบบข้อมูลไม่ถูกต้อง: {line.strip()}")
                continue

            processed_line_hashes.add(line_hash)
            timestamp, student_id, student_name, room, status = record

            # ตรวจสอบ Debounce (ป้องกันการแตะบัตรซ้ำช่วงเวลาสั้นๆ)
            cursor.execute(
                recent_record_query,
                (student_id, room, status, timestamp, DEBOUNCE_INTERVAL_SECONDS, timestamp),
            )
            recent_count = cursor.fetchone()[0]

            if recent_count > 0:
                skipped_duplicate_count += 1
                continue

            cursor.execute(
                insert_query,
                (timestamp, student_id, student_name, room, status),
            )
            if cursor.rowcount == 1:
                new_records_count += 1

        conn.commit()
        save_processed_line_hashes(processed_line_hashes)

        summary_message = f"อัปเดตข้อมูลสำเร็จ: เพิ่มใหม่ {new_records_count} รายการ"
        if skipped_duplicate_count > 0:
            summary_message += f" (ข้ามแตะซ้ำ {skipped_duplicate_count} รายการ)"
        if invalid_format_count > 0:
            summary_message += f" (รูปแบบไม่ถูกต้อง {invalid_format_count} รายการ)"
        logger.info(summary_message)

    except requests.exceptions.RequestException as err:
        logger.error(f"ไม่สามารถเชื่อมต่อไปยัง IoT Server ({IOT_LOG_URL}): {err}")
    except pymysql.MySQLError as err:
        logger.error(f"เกิดข้อผิดพลาดในการเชื่อมต่อหรือบันทึก MySQL: {err}")
    except Exception as err:
        logger.error(f"เกิดข้อผิดพลาดที่ไม่คาดคิด: {err}", exc_info=True)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ------------------------------------------------------------------------------
# Entry Point
# ------------------------------------------------------------------------------
if __name__ == "__main__":
    logger.info(f"เริ่มต้นการทำงาน IoT Sync Service (ความถี่ทุกๆ {POLL_INTERVAL_SECONDS} วินาที)...")
    try:
        while True:
            sync_logs()
            time.sleep(POLL_INTERVAL_SECONDS)
    except KeyboardInterrupt:
        logger.info("หยุดการทำงานของ IoT Sync Service เรียบร้อยแล้ว")
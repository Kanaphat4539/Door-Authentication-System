from fastapi import APIRouter, BackgroundTasks
from app.schemas.schemas import IoTIngestRequest, IoTIngestResponse
from app.services.iot_service import ingest_logs, fetch_and_sync_iot_logs
from app.core.config import settings

router = APIRouter(prefix="/iot", tags=["Member 5 - IoT Sync & Ingestion"])


@router.post("/webhook", response_model=IoTIngestResponse)
def receive_iot_webhook(payload: IoTIngestRequest):
    """
    [รับ Push จากกลุ่ม 6 IoT] รับข้อมูลประวัติการสแกนบัตรหน้าห้องเรียน
    ทำการ Clean, Deduplicate และบันทึกลงในฐานข้อมูล MariaDB ตาราง web_app
    """
    raw_entries = [item.model_dump() for item in payload.logs]
    res = ingest_logs(raw_entries)
    return IoTIngestResponse(
        status="success",
        processed_count=res["processed_count"],
        inserted_count=res["inserted_count"],
        skipped_count=res["skipped_count"],
        message=f"Ingested {res['inserted_count']} new log entries",
    )


@router.post("/sync", response_model=IoTIngestResponse)
def trigger_iot_pull():
    """
    [กระตุ้นการ Pull] ดึงประวัติ Logs ล่าสุดจากเครื่องกลุ่ม 6 (IOT_LOG_URL)
    """
    res = fetch_and_sync_iot_logs()
    return IoTIngestResponse(
        status="success",
        processed_count=res["processed_count"],
        inserted_count=res["inserted_count"],
        skipped_count=res["skipped_count"],
        message=f"Sync completed from {settings.IOT_LOG_URL}",
    )


@router.get("/status")
def get_iot_sync_status():
    """
    ตรวจสอบสถานะการเชื่อมต่อไปยังกลุ่ม 6 IoT
    """
    return {
        "status": "online",
        "iot_url": settings.IOT_LOG_URL,
        "poll_interval_seconds": settings.POLL_INTERVAL_SECONDS,
        "sync_enabled": settings.IOT_SYNC_ENABLED,
    }

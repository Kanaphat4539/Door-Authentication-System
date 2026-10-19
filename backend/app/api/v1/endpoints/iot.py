from typing import Optional, Dict, Any
from fastapi import APIRouter, Query
from app.schemas.schemas import IoTIngestRequest, IoTIngestResponse
from app.services.iot_service import (
    ingest_logs,
    fetch_and_sync_iot_logs,
    get_synced_logs,
    get_last_sync_info,
)
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
@router.get("/sync", response_model=IoTIngestResponse)
def trigger_iot_pull(
    url: Optional[str] = Query(
        None,
        description="URL ของ IoT Logs Server เช่น http://172.16.10.200:3000/api/logs (หากไม่ระบุจะใช้ค่าจาก settings)",
    )
):
    """
    [กระตุ้นการ Pull] ดึงประวัติ Logs ล่าสุดจากเครื่องกลุ่ม 6 (IOT_LOG_URL เช่น http://172.16.10.200:3000/api/logs)
    ทำการ Clean, Validate, Deduplicate และบันทึกเพื่อแสดงผลบนหน้าเว็บทันที
    """
    target_url = url or settings.IOT_LOG_URL
    res = fetch_and_sync_iot_logs(target_url=target_url)
    return IoTIngestResponse(
        status=res.get("status", "success"),
        processed_count=res.get("processed_count", 0),
        inserted_count=res.get("inserted_count", 0),
        skipped_count=res.get("skipped_count", 0),
        message=f"Sync completed from {target_url} (พบ {res.get('processed_count', 0)} รายการ, เพิ่ม {res.get('inserted_count', 0)} รายการ, ซ้ำ {res.get('skipped_count', 0)} รายการ)",
    )


@router.get("/logs")
def get_current_iot_logs():
    """
    ดูรายการ Log ที่ดึงมาจาก IoT Server ล่าสุด
    """
    logs = get_synced_logs()
    sync_info = get_last_sync_info()
    return {
        "status": "success",
        "total": len(logs),
        "target_url": sync_info.get("target_url", settings.IOT_LOG_URL),
        "last_sync_time": sync_info.get("last_sync_time"),
        "logs": logs,
    }


@router.get("/status")
def get_iot_sync_status():
    """
    ตรวจสอบสถานะการเชื่อมต่อไปยังกลุ่ม 6 IoT
    """
    sync_info = get_last_sync_info()
    return {
        "status": "online",
        "iot_url": settings.IOT_LOG_URL,
        "poll_interval_seconds": settings.POLL_INTERVAL_SECONDS,
        "sync_enabled": settings.IOT_SYNC_ENABLED,
        "total_synced_logs": sync_info.get("total_synced", 0),
        "last_sync_time": sync_info.get("last_sync_time"),
        "last_sync_status": sync_info.get("last_status", "idle"),
    }

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any
from datetime import date

from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.api import api_router
from app.api.v1.endpoints.logs import search_access_logs
from app.services.group3_client import group3_client
from app.services.iot_service import fetch_and_sync_iot_logs

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")


async def background_iot_poller():
    """Background task for polling IoT logs periodically when enabled"""
    logger.info(f"🚀 IoT Polling task started (Interval: {settings.POLL_INTERVAL_SECONDS}s, URL: {settings.IOT_LOG_URL})")
    while True:
        try:
            fetch_and_sync_iot_logs()
        except Exception as e:
            logger.error(f"Error in background IoT poller: {e}")
        await asyncio.sleep(settings.POLL_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: sync immediately
    try:
        fetch_and_sync_iot_logs()
    except Exception as e:
        logger.warning(f"Initial IoT sync error: {e}")

    poller_task = None
    if settings.IOT_SYNC_ENABLED:
        poller_task = asyncio.create_task(background_iot_poller())
    yield
    # Shutdown
    if poller_task:
        poller_task.cancel()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Unified FastAPI Backend for Group 4 (Auth, Logs Search, Audit Log, IoT Ingestion)",
    version=settings.VERSION,
    lifespan=lifespan,
)

# ตั้งค่า CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ติดตั้ง Router API v1
app.include_router(api_router, prefix=settings.API_V1_STR)

# เพิ่ม Endpoint เข้ากันได้ย้อนหลัง (Backward Compatibility) กับ Legacy PHP call
@app.get("/api/get_dashboard_data.php", tags=["Backward Compatibility"])
def legacy_dashboard_data(
    student_id: Optional[str] = Query(None),
    keyword: Optional[str] = Query(None),
    room: str = Query("all"),
    selected_date: Optional[date] = Query(None, alias="date"),
    time_slot: str = Query("all"),
    lang: str = Query("th"),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_teacher: Dict[str, Any] = Depends(search_access_logs),
):
    return current_teacher


@app.get("/", tags=["Health Check"])
def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "group3_configured": group3_client.is_external_configured(),
        "iot_sync_enabled": settings.IOT_SYNC_ENABLED,
    }


@app.get("/health", tags=["Health Check"])
def health_check():
    return {"status": "healthy"}

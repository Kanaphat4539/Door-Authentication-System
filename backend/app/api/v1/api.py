from fastapi import APIRouter
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.logs import router as logs_router
from app.api.v1.endpoints.audit import router as audit_router
from app.api.v1.endpoints.iot import router as iot_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(logs_router)
api_router.include_router(audit_router)
api_router.include_router(iot_router)

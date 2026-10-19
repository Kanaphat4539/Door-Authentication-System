from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.schemas import AuditLogRequest, AuditLogResponse
from app.core.security import verify_token
from app.services.audit_service import log_user_action

router = APIRouter(prefix="/audit", tags=["Member 4 & 7 - Audit Logs"])


@router.post("/log", response_model=AuditLogResponse)
def record_audit_log(
    payload: AuditLogRequest,
    current_user: Dict[str, Any] = Depends(verify_token),
):
    """
    [คนที่ 1-3 เรียกใช้] บันทึกเหตุการณ์การใช้งานหน้าเว็บลงตาราง user
    """
    username = current_user.get("sub", "unknown")
    role = current_user.get("role", "teacher")
    if not payload.action:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Action description is required",
        )

    success = log_user_action(username=username, action=payload.action, role=role, background=True)
    return AuditLogResponse(
        status="success",
        message="Audit log queued successfully" if success else "Failed to record audit log",
        action=payload.action,
        username=username,
        role=role,
    )

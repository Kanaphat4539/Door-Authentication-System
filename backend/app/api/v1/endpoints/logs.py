from datetime import date
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from app.core.security import require_teacher_role
from app.services.audit_service import log_user_action
from app.services.log_service import get_dashboard_data
from app.schemas.schemas import DashboardDataResponse

router = APIRouter(tags=["Member 6 - Access Logs"])


@router.get("/logs", response_model=DashboardDataResponse)
def search_access_logs(
    student_id: Optional[str] = Query(None, description="ค้นหารหัสนักศึกษา หรือชื่อ-นามสกุล", max_length=150),
    keyword: Optional[str] = Query(None, description="คำค้นหา (Alias ของ student_id)"),
    room: str = Query("all", description="กรองห้องเรียน เช่น B217, E107", max_length=10),
    selected_date: Optional[date] = Query(None, alias="date", description="กรองตามวันที่ (YYYY-MM-DD)"),
    time_slot: str = Query("all", description="ช่วงเวลา เช่น 08:00, 14:00"),
    lang: str = Query("th", description="ภาษา th หรือ en"),
    status: Optional[str] = Query(None, description="สถานะ IN หรือ OUT"),
    page: int = Query(1, ge=1, description="เลขหน้า Pagination"),
    limit: int = Query(10, ge=1, le=100, description="จำนวนรายการต่อหน้า"),
    current_teacher: Dict[str, Any] = Depends(require_teacher_role),
) -> Dict[str, Any]:
    """
    [Endpoint คนที่ 6 + คนที่ 4]:
    - ตรวจสอบสิทธิ์อาจารย์ผ่าน Bearer Token (คนที่ 4 - RBAC)
    - บันทึกประวัติการสืบค้นลงตาราง user (คนที่ 4 - Audit Log -> คนที่ 7)
    - ดึงข้อมูลและตัดหน้าจาก MariaDB ตาราง web_app (คนที่ 6 & 7)
    """
    teacher_name = current_teacher.get("sub", "unknown")
    search_keyword = student_id or keyword or None

    # บันทึก Audit Log ลงตาราง user (คนที่ 4 & 7)
    audit_actions = []
    if search_keyword:
        audit_actions.append(f"Search>keyword={search_keyword}")
    if room and room != "all":
        audit_actions.append(f"Filter>room={room}")
    if status and status != "all":
        audit_actions.append(f"Filter>status={status}")

    if audit_actions:
        action_summary = "; ".join(audit_actions)
        log_user_action(username=teacher_name, action=action_summary)

    # เรียกใช้ Search Service ของคนที่ 6
    result = get_dashboard_data(
        student_id=search_keyword,
        room=room if room != "all" else None,
        selected_date=selected_date,
        time_slot=time_slot if time_slot != "all" else None,
        status=status if status != "all" else None,
        page=page,
        limit=limit,
        lang=lang,
    )

    result["requested_by"] = teacher_name
    result["authorized_by"] = teacher_name
    result["role"] = current_teacher.get("role", "teacher")
    result["data"] = result.get("logs", [])

    return result

from datetime import date
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from app.core.security import require_teacher_role, get_current_user
from app.services.audit_service import log_user_action
from app.services.log_service import get_dashboard_data
from app.schemas.schemas import DashboardDataResponse

router = APIRouter(tags=["Member 6 - Access Logs"])


@router.get("/logs", response_model=DashboardDataResponse)
def search_access_logs(
    student_id: Optional[str] = Query(None, description="ค้นหารหัสนักศึกษา", max_length=50),
    keyword: Optional[str] = Query(None, description="คำค้นหา (Alias ของ student_id)"),
    room: str = Query("all", description="กรองห้องเรียน เช่น B217, E107", max_length=10),
    selected_date: Optional[date] = Query(None, alias="date", description="กรองตามวันที่ (YYYY-MM-DD)"),
    time_slot: str = Query("all", description="ช่วงเวลา เช่น 08:00, 14:00"),
    lang: str = Query("th", description="ภาษา th หรือ en"),
    status: Optional[str] = Query(None, description="สถานะ IN หรือ OUT"),
    page: int = Query(1, ge=1, description="เลขหน้า Pagination"),
    limit: int = Query(10, ge=1, le=100, description="จำนวนรายการต่อหน้า"),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    [Endpoint คนที่ 6 + คนที่ 4]:
    - ตรวจสอบสิทธิ์ผ่าน Bearer Token (รองรับทั้ง Teacher และ Student)
    - ป้องกัน IDOR: หากเป็น Student ระบบจะล็อก scope ให้ดูได้เฉพาะ Log ของตนเองเท่านั้น
    - บันทึกประวัติการสืบค้นลงตาราง user (คนที่ 4 - Audit Log -> คนที่ 7)
    - ดึงข้อมูลและตัดหน้าจาก MariaDB ตาราง web_app (คนที่ 6 & 7)
    """
    user_role = current_user.get("role", "teacher")
    user_id = current_user.get("sub", "unknown")

    search_student_id = None
    owner_student_id = None
    if user_role == "student":
        owner_student_id = user_id
    else:
        search_student_id = student_id or keyword or None

    # บันทึก Audit Log ลงตาราง user (คนที่ 4 & 7)
    audit_actions = []
    if user_role == "teacher" and search_student_id:
        audit_actions.append(f"Search>keyword={search_student_id}")
    elif user_role == "student":
        audit_actions.append(f"ViewOwnLogs>student_id={user_id}")
    if room and room != "all":
        audit_actions.append(f"Filter>room={room}")
    if selected_date:
        audit_actions.append(f"Filter>date={selected_date.isoformat()}")
    if time_slot and time_slot != "all":
        audit_actions.append(f"Filter>time_slot={time_slot}")
    if status and status != "all":
        audit_actions.append(f"Filter>status={status}")

    if audit_actions:
        action_summary = "; ".join(audit_actions)
        log_user_action(username=user_id, action=action_summary, role=user_role)

    # เรียกใช้ Search Service ของคนที่ 6
    result = get_dashboard_data(
        student_id=search_student_id,
        owner_student_id=owner_student_id,
        room=room if room != "all" else None,
        selected_date=selected_date,
        time_slot=time_slot if time_slot != "all" else None,
        status=status if status != "all" else None,
        page=page,
        limit=limit,
        lang=lang,
    )

    result["requested_by"] = user_id
    result["authorized_by"] = user_id
    result["role"] = user_role
    result["is_student_isolated"] = (user_role == "student")
    result["data"] = result.get("logs", [])

    return result


@router.get("/admin/logs", response_model=DashboardDataResponse)
def admin_search_access_logs(
    student_id: Optional[str] = Query(None, description="ค้นหารหัสนักศึกษา", max_length=50),
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
    [Admin / Teacher-only Endpoint คนที่ 4]:
    สงวนสิทธิ์เฉพาะอาจารย์ผู้สอนเท่านั้น (Teacher RBAC)
    """
    teacher_name = current_teacher.get("sub", "unknown")
    search_keyword = student_id or keyword or None

    result = get_dashboard_data(
        student_id=search_keyword,
        owner_student_id=None,
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
    result["role"] = "teacher"
    result["is_student_isolated"] = False
    result["data"] = result.get("logs", [])

    return result


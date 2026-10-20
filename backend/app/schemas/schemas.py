from datetime import date
from typing import List, Optional, Any
from pydantic import BaseModel, Field


# -------------------------------------------------------------
# Auth Schemas (Member 1 & 4)
# -------------------------------------------------------------
class LoginRequest(BaseModel):
    username: str = Field(..., examples=["67200324"], description="ชื่อผู้ใช้งาน")
    password: str = Field(..., examples=["67200324"], description="รหัสผ่าน")


class UserInfo(BaseModel):
    username: str
    role: str
    name: Optional[str] = None
    email: Optional[str] = None


class LoginResponse(BaseModel):
    status: str = "success"
    access_token: str
    token_type: str = "bearer"
    user: UserInfo


# -------------------------------------------------------------
# Audit Log Schemas (Member 4 & 7)
# -------------------------------------------------------------
class AuditLogRequest(BaseModel):
    action: str = Field(
        ...,
        examples=["Login>Search>Student", "Search>room=LAB-401"],
        description="พฤติกรรมการใช้งานหน้าเว็บ เช่น 'Login', 'Login>Search>Student', 'Search>room=LAB-401'",
    )


class AuditLogResponse(BaseModel):
    status: str = "success"
    message: str
    action: str
    username: str
    role: Optional[str] = "teacher"


# -------------------------------------------------------------
# Logs Schemas (Member 2, 3, 6, 7)
# -------------------------------------------------------------
class LogItem(BaseModel):
    id: Any
    student_id: str
    name: str
    student_name: Optional[str] = None
    room: str
    roomSub: Optional[str] = ""
    date: str
    time: str
    status: str


class PaginationInfo(BaseModel):
    page: int
    limit: int
    total: int
    totalPages: int


class DashboardDataResponse(BaseModel):
    status: str = "success"
    activeRooms: int
    totalAccess: int
    totalRooms: int = 8
    pagination: PaginationInfo
    logs: List[LogItem]
    data: Optional[List[LogItem]] = None
    requested_by: Optional[str] = None
    authorized_by: Optional[str] = None
    role: Optional[str] = None
    is_student_isolated: Optional[bool] = None


# -------------------------------------------------------------
# IoT Sync Schemas (Member 5 & Group 6)
# -------------------------------------------------------------
class IoTLogItem(BaseModel):
    timestamp: str = Field(..., description="เวลาสแกน เช่น '2026-10-14 15:30:00'")
    student_id: str = Field(..., max_length=8, description="รหัสนักศึกษา 8 หลัก")
    student_name: str = Field(..., max_length=150, description="ชื่อ-นามสกุล")
    room: str = Field(..., max_length=10, description="รหัสห้อง เช่น B217, LAB-401")
    status: str = Field(..., description="สถานะ IN หรือ OUT")


class IoTIngestRequest(BaseModel):
    logs: List[IoTLogItem]


class IoTIngestResponse(BaseModel):
    status: str = "success"
    processed_count: int
    inserted_count: int
    skipped_count: int
    message: str

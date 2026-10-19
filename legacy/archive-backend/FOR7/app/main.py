import os
from typing import Dict, Any

from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from app.security import create_access_token, verify_token
from app.group3_client import group3_client
from app.audit import log_user_action
from app.routers.member6_logs import logs_router

load_dotenv()

app = FastAPI(
    title="Group 4 - Web Application Auth API",
    description="Authentication & Security Service for Teacher Dashboard (Member 4)",
    version="1.0.0",
)

# ตั้งค่า CORS เพื่อให้ Frontend (คนที่ 1-3) สามารถส่งคำขอข้ามพอร์ตมาได้
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # อนุญาตทุก Origin ในโหมดพัฒนา
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# นำ Router ของคนที่ 6 เข้ามาทำงานร่วมกัน
app.include_router(logs_router)

# -------------------------------------------------------------
# Data Models (Pydantic Schemas)
# -------------------------------------------------------------
class LoginRequest(BaseModel):
    username: str = Field(..., examples=["teacher_ajarn"], description="ชื่อผู้ใช้งาน")
    password: str = Field(..., examples=["secure123"], description="รหัสผ่าน")


class UserInfo(BaseModel):
    username: str
    role: str


class LoginResponse(BaseModel):
    status: str = "success"
    access_token: str
    token_type: str = "bearer"
    user: UserInfo


class AuditLogRequest(BaseModel):
    action: str = Field(
        ...,
        examples=["Login>Search>Student", "Search>room=LAB-401"],
        description="พฤติกรรมการใช้งานหน้าเว็บ เช่น 'Login', 'Login>Search>Student', 'Search>room=LAB-401'",
    )


# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------
@app.get("/", tags=["Health Check"])
def root():
    return {
        "status": "online",
        "service": "Group 4 Authentication API",
        "member": 4,
        "docs_url": "/docs",
        "group3_external_configured": group3_client.is_external_configured(),
    }


@app.post(
    "/api/v1/auth/login",
    response_model=LoginResponse,
    tags=["Authentication (Member 1 -> Member 4)"],
)
def login(payload: LoginRequest):
    """
    [คนที่ 1 เรียกใช้] รับ username/password ตรวจสอบตัวตนกับกลุ่ม 3 แล้วออก JWT Token
    """
    print(f"\n📥 [LOGIN REQUEST] มีคำขอล็อกอินเข้ามา: username='{payload.username}'")

    if not payload.username or not payload.password:
        print("⚠️ [LOGIN FAILED] ข้อมูลไม่ครบถ้วน (Username หรือ Password ว่างเปล่า)")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password are required",
        )

    is_valid, role = group3_client.verify(payload.username, payload.password)
    if not is_valid or not role:
        print(f"❌ [LOGIN FAILED] ตรวจสอบไม่ผ่าน: username='{payload.username}' (รหัสผ่านผิด หรือไม่พบบัญชี)")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    token = create_access_token(username=payload.username, role=role)
    print(f"✅ [LOGIN SUCCESS] สำเร็จ! username='{payload.username}', role='{role}' ➔ ออก JWT Token ให้เรียบร้อย")

    # [หน้าที่คนที่ 4] บันทึก Audit Log พฤติกรรม 'Login' ลงตาราง user (ครอบ try-except ปลอดภัย 100%)
    log_user_action(username=payload.username, action="Login")

    return LoginResponse(
        status="success",
        access_token=token,
        token_type="bearer",
        user=UserInfo(username=payload.username, role=role),
    )


@app.post(
    "/api/v1/audit/log",
    tags=["Audit Log (Member 4 -> DB)"],
    summary="บันทึก Audit Log พฤติกรรมการใช้งานหน้าเว็บลงตาราง user (คนที่ 7 กำหนด)",
)
def create_audit_log(
    body: AuditLogRequest,
    current_user: Dict[str, Any] = Depends(verify_token),
):
    """
    [Frontend คนที่ 1-3 หรือระบบภายในเรียกใช้]
    บันทึกพฤติกรรมการใช้งานหน้าเว็บลงตาราง user ตามสเปกคนที่ 7
    ตัวอย่าง action:
      - 'Login'
      - 'Login>Search>Student'
      - 'Search>room=LAB-401'
    """
    username = current_user.get("sub", "unknown")
    logged = log_user_action(username=username, action=body.action)
    return {
        "status": "success",
        "logged": logged,
        "username": username,
        "action": body.action,
    }


@app.get(
    "/api/v1/auth/me",
    tags=["Authentication (Member 1 -> Member 4)"],
)
def get_current_user_profile(user: Dict[str, Any] = Depends(verify_token)):
    """
    ตรวจสอบและถอดรหัส Token ของผู้ใช้ปัจจุบัน
    """
    return {
        "status": "success",
        "user": {
            "username": user.get("sub"),
            "role": user.get("role"),
            "issued_at": user.get("iat"),
            "expires_at": user.get("exp"),
        },
    }

from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.schemas import LoginRequest, LoginResponse, UserInfo
from app.services.group3_client import group3_client
from app.core.security import create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication (Member 1 & 4)"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest):
    """
    [คนที่ 1 เรียกใช้] รับ username/password ตรวจสอบตัวตนกับกลุ่ม 3 แล้วออก JWT Token
    """
    if not payload.username or not payload.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password are required",
        )

    is_valid, role = group3_client.verify(payload.username, payload.password)
    if not is_valid or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    token = create_access_token(username=payload.username, role=role)

    # Mock user details for richer frontend display
    email = f"{payload.username}@university.ac.th"
    name = "อาจารย์ สมชาย ใจดี" if role == "teacher" else "นาย สมชาย ใจกล้า"

    return LoginResponse(
        status="success",
        access_token=token,
        token_type="bearer",
        user=UserInfo(username=payload.username, role=role, name=name, email=email),
    )


@router.get("/me")
def get_user_profile(current_user: dict = Depends(get_current_user)):
    """
    ดึงข้อมูลโปรไฟล์ของผู้ใช้งานที่ล็อกอินอยู่
    """
    username = current_user.get("sub", "")
    role = current_user.get("role", "teacher")
    user_info = {
        "username": username,
        "role": role,
        "name": "อาจารย์ สมชาย ใจดี" if role == "teacher" else username,
        "email": f"{username}@university.ac.th",
    }
    return {
        "status": "success",
        "username": username,
        "role": role,
        "user": user_info,
        "name": user_info["name"],
        "email": user_info["email"],
    }


@router.post("/logout")
def logout():
    """
    ออกจากระบบ (Client ทำการลบ Token ออกจากหน่วยความจำ)
    """
    return {"status": "success", "message": "Successfully logged out"}

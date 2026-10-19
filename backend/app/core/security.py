from datetime import datetime, timedelta, timezone
from typing import Dict, Any

import jwt
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings

# FastAPI Security Bearer scheme for Swagger UI & Header parsing
security_bearer = HTTPBearer(auto_error=True)


def create_access_token(username: str, role: str) -> str:
    """
    สร้าง JWT Token สำหรับส่งกลับไปให้ Frontend (คนที่ 1 / 3)
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": username,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


MOCK_DEV_TOKENS: Dict[str, Dict[str, str]] = {
    "mock-jwt-bearer-token-teacher-dev": {"sub": "teacher_ajarn", "role": "teacher"},
    "mock-jwt-token-teacher-ajarn": {"sub": "teacher_ajarn", "role": "teacher"},
    "mock-jwt-bearer-token-student-dev": {"sub": "student_somchai", "role": "student"},
    "mock-jwt-token-student-somchai": {"sub": "student_somchai", "role": "student"},
}


def verify_token(credentials: HTTPAuthorizationCredentials = Security(security_bearer)) -> Dict[str, Any]:
    """
    Middleware ดักตรวจ Token จาก Authorization: Bearer <token>
    """
    token = credentials.credentials

    # รองรับ Mock/Demo Token สำหรับการทดสอบ Frontend Demo และ Offline Mode
    if settings.USE_MOCK_FALLBACK and token in MOCK_DEV_TOKENS:
        info = MOCK_DEV_TOKENS[token]
        return {
            "sub": info["sub"],
            "role": info["role"],
            "iat": int(datetime.now(timezone.utc).timestamp()),
            "exp": int((datetime.now(timezone.utc) + timedelta(hours=24)).timestamp()),
        }

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please login again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token. Authentication failed.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_teacher_role(payload: Dict[str, Any] = Security(verify_token)) -> Dict[str, Any]:
    """
    Middleware ตรวจสอบสิทธิ์อาจารย์ (RBAC)
    ใช้ครอบ Route ที่ต้องการสิทธิ์อาจารย์ เช่น GET /api/v1/logs
    """
    role = payload.get("role")
    if role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: This resource requires teacher privileges.",
        )
    return payload


def get_current_user(payload: Dict[str, Any] = Security(verify_token)) -> Dict[str, Any]:
    """
    ดึงข้อมูล user ปัจจุบันจาก JWT token (รองรับทั้ง teacher และ student)
    """
    role = payload.get("role")
    user_id = payload.get("sub") or payload.get("username")
    if role not in {"teacher", "student"} or not isinstance(user_id, str) or not user_id.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint requires a teacher or student account with an identity.",
        )
    return {**payload, "sub": user_id, "role": role}

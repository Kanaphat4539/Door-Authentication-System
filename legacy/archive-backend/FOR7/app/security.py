import os
from datetime import datetime, timedelta, timezone
from typing import Dict, Any

import jwt
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "super_secret_kmitl_security_key_group4")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))

# FastAPI Security Bearer scheme for Swagger UI & Header parsing
security_bearer = HTTPBearer(auto_error=True)


def create_access_token(username: str, role: str) -> str:
    """
    สร้าง JWT Token สำหรับส่งกลับไปให้ Frontend (คนที่ 1)
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": username,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(credentials: HTTPAuthorizationCredentials = Security(security_bearer)) -> Dict[str, Any]:
    """
    Middleware ดักตรวจ Token จาก Authorization: Bearer <token>
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
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
    ส่งต่อฟังก์ชันนี้ให้ 'คนที่ 6' นำไปครอบ Route GET /api/v1/logs
    """
    role = payload.get("role")
    if role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: This resource requires teacher privileges.",
        )
    return payload

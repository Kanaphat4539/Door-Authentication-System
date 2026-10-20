from datetime import datetime
from sqlalchemy import Column, BigInteger, String, DateTime, Enum, text
from app.db.database import Base


class WebAppLog(Base):
    """
    ตาราง web_app สำหรับเก็บประวัติการเข้า-ออกห้องเรียน (Member 5, 6, 7)
    """
    __tablename__ = "web_app"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    student_id = Column(String(8), nullable=False, index=True)
    student_name = Column(String(150), nullable=False)
    room = Column(String(10), nullable=False, index=True)
    status = Column(Enum("IN", "OUT", name="access_status_enum"), nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "student_id": self.student_id,
            "student_name": self.student_name,
            "room": self.room,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class UserAudit(Base):
    """
    ตาราง user สำหรับเก็บประวัติการสืบค้นและกระทำบนหน้าเว็บของผู้ใช้งาน (Member 4, 7)
    """
    __tablename__ = "user"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"), index=True)
    username = Column(String(100), nullable=False, index=True)
    role = Column(Enum("teacher", "student", name="user_role_enum"), nullable=False, default="teacher", server_default=text("'teacher'"), index=True)
    action = Column(String(255), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "username": self.username,
            "role": self.role,
            "action": self.action,
        }

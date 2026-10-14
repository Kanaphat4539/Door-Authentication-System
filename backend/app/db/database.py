import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

logger = logging.getLogger("database")

# สร้าง SQLAlchemy Engine
# กรณีทดสอบหรือไม่มี DB ให้สามารถทำงานต่อไปได้
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    connect_args={"connect_timeout": 5},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """
    FastAPI Dependency สำหรับเปิดและปิด Database Session อัตโนมัติในแต่ละ Request
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

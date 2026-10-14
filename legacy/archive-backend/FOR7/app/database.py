import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

# ดึงค่าการเชื่อมต่อฐานข้อมูลจาก .env
DB_USER = os.getenv("DB_USER", "app_backend")
DB_PASSWORD = os.getenv("DB_PASSWORD", "Password1234!")
DB_HOST = os.getenv("DB_HOST", "192.168.100.104")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "web_app_db")

# รูปแบบ Connection URI: mysql+pymysql://<user>:<password>@<host>:<port>/<db_name>
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}",
)

# สร้าง SQLAlchemy Engine พร้อมตั้งค่า Timeout 5 วินาทีเพื่อป้องกันเซิร์ฟเวอร์ค้าง
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # ตรวจสอบการเชื่อมต่อก่อนส่ง Query เสมอ
    pool_recycle=3600,   # รีไซเคิล Connection ทุก 1 ชั่วโมง
    connect_args={"connect_timeout": 5},
)

# SessionFactory สำหรับสร้าง Session ทำงานกับ Database
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base Model สำหรับสร้าง ORM Models (คนที่ 5 และ 6 นำไปสืบทอดสร้าง Class ตารางได้เลย)
Base = declarative_base()


def get_db():
    """
    FastAPI Dependency สำหรับเปิดและปิด Database Session อัตโนมัติในแต่ละ Request
    การใช้งานใน Router:
        @router.get("/items")
        def read_items(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

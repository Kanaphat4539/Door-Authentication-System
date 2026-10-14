import os
from typing import List
from dotenv import load_dotenv

load_dotenv()


class Settings:
    PROJECT_NAME: str = "Group 4 - Web Application Backend (Access Log & Teacher Dashboard)"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"

    # JWT Settings (Member 4)
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super_secret_kmitl_security_key_group4")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))

    # Central Auth Service (Group 3 on Proxmox)
    GROUP3_AUTH_URL: str = os.getenv("GROUP3_AUTH_URL", "http://192.168.100.103:8000/auth/login")
    GROUP3_TIMEOUT_SECONDS: float = float(os.getenv("GROUP3_TIMEOUT_SECONDS", "5.0"))
    USE_MOCK_FALLBACK: bool = os.getenv("USE_MOCK_FALLBACK", "true").lower() in ("true", "1", "yes")

    # Database Configuration (Member 7 - MariaDB / MySQL)
    DB_USER: str = os.getenv("DB_USER", "app_backend")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "Password1234!")
    DB_HOST: str = os.getenv("DB_HOST", "192.168.100.104")
    DB_PORT: str = os.getenv("DB_PORT", "3306")
    DB_NAME: str = os.getenv("DB_NAME", "web_app_db")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}",
    )

    # IoT Ingestion & Sync (Member 5 - Group 6 IoT Server)
    IOT_LOG_URL: str = os.getenv("IOT_LOG_URL", "http://192.168.100.106/api/logs")
    POLL_INTERVAL_SECONDS: int = int(os.getenv("POLL_INTERVAL_SECONDS", "20"))
    IOT_SYNC_ENABLED: bool = os.getenv("IOT_SYNC_ENABLED", "false").lower() in ("true", "1", "yes")

    # CORS settings
    CORS_ORIGINS: List[str] = ["*"]


settings = Settings()

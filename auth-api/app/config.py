from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env",
        env_file_encoding="utf-8", extra="ignore", hide_input_in_errors=True,
    )

    auth_mode: Literal["radius", "mock"] = "radius"
    radius_host: str = ""
    radius_port: int = Field(default=1812, ge=1, le=65535)
    radius_secret: SecretStr = SecretStr("")
    radius_timeout: float = Field(default=3, gt=0, le=30)
    radius_attempts: int = Field(default=2, ge=1, le=3)
    radius_nas_identifier: str = "auth-api"

    jwt_secret: SecretStr = SecretStr("")
    jwt_issuer: str = Field(default="auth-api", min_length=1)
    jwt_audience: str = Field(default="door-system", min_length=1)
    access_token_expire_minutes: int = Field(default=15, ge=1, le=60)

    mock_username: str = ""
    mock_password: SecretStr = SecretStr("")

    @field_validator("radius_nas_identifier")
    @classmethod
    def validate_nas_identifier(cls, value: str) -> str:
        if not value.strip() or len(value.encode("utf-8")) > 253:
            raise ValueError("RADIUS_NAS_IDENTIFIER must be nonblank and at most 253 UTF-8 bytes")
        return value

    @field_validator("jwt_secret")
    @classmethod
    def validate_signing_key(cls, value: SecretStr) -> SecretStr:
        secret = value.get_secret_value()
        if secret and len(secret.encode("utf-8")) < 32:
            raise ValueError("JWT_SECRET must contain at least 32 bytes")
        return value

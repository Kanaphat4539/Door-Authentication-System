from pydantic import BaseModel, Field, SecretStr, field_validator


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=253)
    password: SecretStr

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        if not value.strip() or len(value.encode("utf-8")) > 253:
            raise ValueError("Username must be nonblank and at most 253 UTF-8 bytes")
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: SecretStr) -> SecretStr:
        password = value.get_secret_value()
        if not password or len(password.encode("utf-8")) > 128 or "\x00" in password:
            raise ValueError("Password must be 1 to 128 UTF-8 bytes without NUL")
        return value


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    username: str

from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from app.config import Settings


class TokenConfigurationError(Exception):
    """Signing configuration is not ready."""


def _signing_key(settings: Settings) -> str:
    key = settings.jwt_secret.get_secret_value()
    if not key:
        raise TokenConfigurationError("JWT signing is not configured")
    return key


def create_access_token(
    username: str,
    settings: Settings,
    role: str | None = None,
    user_id: str | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": username,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
    }
    if role is not None:
        payload["role"] = role
    if user_id is not None:
        payload["user_id"] = user_id
    return jwt.encode(payload, _signing_key(settings), algorithm="HS256")


def decode_access_token(token: str, settings: Settings) -> dict[str, Any]:
    claims = jwt.decode(
        token, _signing_key(settings), algorithms=["HS256"],
        audience=settings.jwt_audience, issuer=settings.jwt_issuer,
        options={"require": ["sub", "iat", "exp", "iss", "aud"]},
    )
    subject = claims["sub"]
    if not isinstance(subject, str) or not subject.strip():
        raise jwt.InvalidTokenError("Invalid subject")
    return claims

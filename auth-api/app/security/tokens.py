from datetime import datetime, timedelta, timezone

import jwt

from app.config import Settings


class TokenConfigurationError(Exception):
    """Signing configuration is not ready."""


def _signing_key(settings: Settings) -> str:
    key = settings.jwt_secret.get_secret_value()
    if not key:
        raise TokenConfigurationError("JWT signing is not configured")
    return key


def create_access_token(username: str, settings: Settings) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": username, "iat": now,
         "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
         "iss": settings.jwt_issuer, "aud": settings.jwt_audience},
        _signing_key(settings), algorithm="HS256",
    )


def decode_access_token(token: str, settings: Settings) -> str:
    claims = jwt.decode(
        token, _signing_key(settings), algorithms=["HS256"],
        audience=settings.jwt_audience, issuer=settings.jwt_issuer,
        options={"require": ["sub", "iat", "exp", "iss", "aud"]},
    )
    subject = claims["sub"]
    if not isinstance(subject, str) or not subject.strip():
        raise jwt.InvalidTokenError("Invalid subject")
    return subject

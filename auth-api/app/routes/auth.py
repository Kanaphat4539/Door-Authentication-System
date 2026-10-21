from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse
from app.security.tokens import TokenConfigurationError, create_access_token, decode_access_token
from app.services.radius import AuthenticationUnavailable, authenticate

router = APIRouter(prefix="/auth", tags=["Authentication"])
bearer = HTTPBearer(auto_error=False)


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


@router.post("/login", response_model=TokenResponse)
def login(
    body: LoginRequest, response: Response,
    settings: Annotated[Settings, Depends(get_settings)],
) -> TokenResponse:
    if not settings.jwt_secret.get_secret_value():
        raise HTTPException(status_code=503, detail="JWT signing is not configured")
    try:
        accepted = authenticate(body.username, body.password.get_secret_value(), settings)
    except AuthenticationUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if not accepted:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user_role: str | None = accepted.role
    user_id: str | None = accepted.user_id
    if settings.auth_mode == "mock" and settings.mock_role:
        user_role = settings.mock_role

    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return TokenResponse(
        access_token=create_access_token(
            body.username,
            settings,
            role=user_role,
            user_id=user_id,
        ),
        expires_in=settings.access_token_expire_minutes * 60,
    )


@router.get("/me", response_model=UserResponse, response_model_exclude_none=True)
def me(
    response: Response,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> UserResponse:
    unauthorized = HTTPException(
        status_code=401, detail="Invalid or expired access token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    try:
        claims = decode_access_token(credentials.credentials, settings)
    except jwt.InvalidTokenError as exc:
        raise unauthorized from exc
    except TokenConfigurationError as exc:
        raise HTTPException(status_code=503, detail="JWT signing is not configured") from exc
    response.headers["Cache-Control"] = "no-store"
    return UserResponse(
        username=claims["sub"],
        role=claims.get("role"),
        user_id=claims.get("user_id"),
    )

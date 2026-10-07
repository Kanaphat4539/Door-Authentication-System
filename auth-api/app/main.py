from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.config import Settings
from app.routes.auth import router


def create_app(settings: Settings | None = None) -> FastAPI:
    application = FastAPI(title="Door Authentication API", version="0.1.0")
    application.state.settings = settings if settings is not None else Settings()
    application.include_router(router)

    @application.exception_handler(RequestValidationError)
    async def validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
        # FastAPI's default includes submitted values, which may contain passwords.
        errors = [{"loc": error["loc"], "type": error["type"], "msg": error["msg"]}
                  for error in exc.errors()]
        return JSONResponse(status_code=422, content={"detail": errors})

    @application.get("/health", tags=["Health"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return application


app = create_app()

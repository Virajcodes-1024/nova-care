import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from .config import ORIGINS
from .database import Base, engine
from .routes import router


@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title="NOVA Care local simulation", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Content-Type"],
)
app.include_router(router)


@app.exception_handler(HTTPException)
async def http_error(request: Request, error: HTTPException):
    return JSONResponse(status_code=error.status_code, content={"error": {"message": str(error.detail)}})


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, error: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": {"message": "Invalid request. Check required fields, allowed values, and input length."}
        },
    )


@app.exception_handler(Exception)
async def internal_error(request: Request, error: Exception):
    logging.exception("NOVA request failed")
    return JSONResponse(
        status_code=500,
        content={
            "error": {"message": "Local operation failed. No success is claimed. Consult the backend log."}
        },
    )

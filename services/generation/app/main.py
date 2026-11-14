from __future__ import annotations

from contextlib import asynccontextmanager
import logging
from time import perf_counter

from fastapi import FastAPI, HTTPException, Request
import httpx

from app.config import (
    GENERATION_LOG_BACKUP_COUNT,
    GENERATION_LOG_FILE,
    GENERATION_LOG_LEVEL,
    GENERATION_LOG_MAX_BYTES,
    PHP_AI_GATEWAY_TIMEOUT,
    GENERATION_MAX_CONTEXT_CHARS,
    GENERATION_KNOWLEDGE_LIMIT,
    GENERATION_CHUNK_SIZE_CHARS,
    GENERATION_CHUNK_OVERLAP_CHARS,
    GENERATION_TOP_K,
    INTERNAL_SERVICE_TOKEN,
    PHP_HTTP_TIMEOUT,
    PHP_INTERNAL_API_URL,
)
from app.infrastructure.php_client import PHPClient, PHPServiceError
from app.logging_config import configure_logging, normalize_request_id, reset_request_id, set_request_id
from app.orchestration.generation_service import GenerationService
from app.schemas import GenerationRequest, GenerationResponse

logger = configure_logging(
    log_file=GENERATION_LOG_FILE,
    level=GENERATION_LOG_LEVEL,
    max_bytes=GENERATION_LOG_MAX_BYTES,
    backup_count=GENERATION_LOG_BACKUP_COUNT,
)
_KNOWN_HTTP_PATHS = {"/health", "/v1/generation/chat"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "Generation service starting",
        extra={"event": "service_starting", "top_k": GENERATION_TOP_K,
               "context_chars": GENERATION_MAX_CONTEXT_CHARS, "log_file": GENERATION_LOG_FILE,
               "log_level": GENERATION_LOG_LEVEL, "log_max_bytes": GENERATION_LOG_MAX_BYTES,
               "log_backup_count": GENERATION_LOG_BACKUP_COUNT},
    )
    php = PHPClient(PHP_INTERNAL_API_URL, INTERNAL_SERVICE_TOKEN, timeout=max(PHP_HTTP_TIMEOUT, PHP_AI_GATEWAY_TIMEOUT))
    app.state.php = php
    app.state.generation = GenerationService(
        php,
        GENERATION_TOP_K,
        GENERATION_MAX_CONTEXT_CHARS,
        GENERATION_KNOWLEDGE_LIMIT,
        GENERATION_CHUNK_SIZE_CHARS,
        GENERATION_CHUNK_OVERLAP_CHARS,
    )
    logger.info("Generation service started", extra={"event": "service_started"})
    try:
        yield
    finally:
        await php.close()
        logger.info("Generation service stopped", extra={"event": "service_stopped"})


app = FastAPI(title="Energytool Generation Service", version="1.0.0", lifespan=lifespan)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    supplied_request_id = request.headers.get("X-Request-ID")
    request_id = normalize_request_id(supplied_request_id)
    token = set_request_id(request_id)
    started = perf_counter()
    raw_path = request.url.path
    # Only known route templates are logged. Arbitrary 404 paths may contain
    # identifiers or other caller-controlled values, so they become /unmatched.
    path = raw_path if raw_path in _KNOWN_HTTP_PATHS else "/unmatched"
    should_log = raw_path != "/health"
    if should_log:
        logger.info(
            "HTTP request started",
            extra={"event": "http_request_started", "request_id": request_id,
                   "method": request.method, "path": path},
        )
    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        if should_log:
            logger.info(
                "HTTP request completed",
                extra={"event": "http_request_completed", "request_id": request_id,
                       "method": request.method, "path": path,
                       "status_code": response.status_code,
                       "duration_ms": round((perf_counter() - started) * 1000, 2)},
            )
        return response
    except Exception as exc:
        logger.exception(
            "HTTP request failed",
            extra={"event": "http_request_failed", "request_id": request_id,
                   "method": request.method, "path": path,
                   "duration_ms": round((perf_counter() - started) * 1000, 2),
                   "exception_type": type(exc).__name__},
        )
        raise
    finally:
        reset_request_id(token)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "generation"}


@app.post("/v1/generation/chat", response_model=GenerationResponse)
async def generate(payload: GenerationRequest, request: Request):
    logger.info(
        "Generation request accepted",
        extra={"event": "generation_request_accepted", "question_chars": len(payload.question),
               "message_count": payload.history_message_count,
               "history_source": "chat_messages" if payload.chat_messages is not None else "messages",
               "top_k": payload.top_k, "debug_enabled": payload.debug},
    )
    try:
        result = await request.app.state.generation.answer(payload)
        return result
    except PHPServiceError as exc:
        logger.exception(
            "Generation failed because an internal PHP service request failed",
            extra={"event": "generation_upstream_error", "exception_type": type(exc).__name__},
        )
        raise HTTPException(status_code=502, detail="Internal knowledge or AI service request failed") from exc
    except httpx.TimeoutException as exc:
        logger.exception(
            "Generation timed out while waiting for an internal service",
            extra={"event": "generation_timeout", "exception_type": type(exc).__name__},
        )
        raise HTTPException(status_code=504, detail="Internal service request timed out") from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(
            "Unexpected generation error",
            extra={"event": "generation_unexpected_error", "exception_type": type(exc).__name__},
        )
        raise HTTPException(status_code=500, detail="Generation failed") from exc

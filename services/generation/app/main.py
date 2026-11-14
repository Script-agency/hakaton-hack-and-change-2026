from __future__ import annotations

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
import httpx

from app.config import (
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
from app.orchestration.generation_service import GenerationService
from app.schemas import GenerationRequest, GenerationResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
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
    try:
        yield
    finally:
        await php.close()


app = FastAPI(title="Energytool Generation Service", version="1.0.0", lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "generation"}


@app.post("/v1/generation/chat", response_model=GenerationResponse)
async def generate(payload: GenerationRequest, request: Request):
    try:
        result = await request.app.state.generation.answer(payload)
        return result
    except PHPServiceError as exc:
        print(f"PHP upstream error: {exc}", flush=True)
        raise HTTPException(status_code=502, detail="Internal knowledge or AI service request failed") from exc
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail="Internal service request timed out") from exc
    except HTTPException:
        raise
    except Exception as exc:
        # Keep the public response concise; full exception goes to container logs.
        print(f"generation error: {type(exc).__name__}: {exc}", flush=True)
        raise HTTPException(status_code=500, detail="Generation failed") from exc

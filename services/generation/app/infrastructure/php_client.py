from __future__ import annotations

import logging
import re
from time import perf_counter
from urllib.parse import urlsplit
from typing import Any

import httpx

from app.logging_config import get_request_id

logger = logging.getLogger("generation.php_client")


def _safe_api_path(value: str) -> str:
    """Map known internal API routes to safe templates for logs."""
    path = urlsplit(value).path or "/"
    path = re.sub(r"(?<=/)\d+(?=/|$)", "{id}", path)
    allowed = {
        "/internal/v1/knowledge/categories",
        "/internal/v1/knowledge/retrieve",
        "/internal/v1/knowledge/parts/{id}/cache",
        "/ai/chat",
    }
    return path if path in allowed else "/internal-api"


class PHPServiceError(RuntimeError):
    pass


class PHPClient:
    def __init__(self, base_url: str, token: str, timeout: float = 60.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.headers = {"Authorization": f"Bearer {token}"}
        self.client = httpx.AsyncClient(timeout=httpx.Timeout(timeout, connect=8.0), headers=self.headers)

    async def close(self) -> None:
        await self.client.aclose()
        logger.info("PHP HTTP client closed", extra={"event": "php_client_closed"})

    def _request_headers(self) -> dict[str, str]:
        request_id = get_request_id()
        return {"X-Request-ID": request_id} if request_id != "-" else {}

    async def _json(self, method: str, path: str, payload: dict | None = None) -> dict[str, Any]:
        started = perf_counter()
        try:
            response = await self.client.request(
                method,
                self.base_url + path,
                json=payload,
                headers=self._request_headers(),
            )
        except httpx.TimeoutException as exc:
            logger.error(
                "PHP API request timed out",
                extra={"event": "php_http_timeout", "method": method, "upstream_path": _safe_api_path(path),
                       "duration_ms": round((perf_counter() - started) * 1000, 2),
                       "exception_type": type(exc).__name__},
            )
            # Preserve TimeoutException so the API layer can return HTTP 504.
            raise
        except httpx.HTTPError as exc:
            logger.error(
                "PHP API request failed before receiving a response",
                extra={"event": "php_http_request_failed", "method": method, "upstream_path": _safe_api_path(path),
                       "duration_ms": round((perf_counter() - started) * 1000, 2),
                       "exception_type": type(exc).__name__},
            )
            raise PHPServiceError(f"PHP API request failed for {path}") from None

        elapsed = round((perf_counter() - started) * 1000, 2)
        if response.status_code >= 400:
            logger.error(
                "PHP API returned an unsuccessful status",
                extra={"event": "php_http_error", "method": method, "upstream_path": _safe_api_path(path),
                       "status_code": response.status_code, "duration_ms": elapsed},
            )
            # Do not include response.text: upstream responses may contain user or document data.
            raise PHPServiceError(f"PHP API {path} returned HTTP {response.status_code}")

        logger.info(
            "PHP API request completed",
            extra={"event": "php_http_response", "method": method, "upstream_path": _safe_api_path(path),
                   "status_code": response.status_code, "duration_ms": elapsed,
                   "response_bytes": len(response.content)},
        )
        try:
            data = response.json()
        except ValueError as exc:
            logger.exception(
                "PHP API returned invalid JSON",
                extra={"event": "php_invalid_json", "method": method, "upstream_path": _safe_api_path(path),
                       "status_code": response.status_code, "exception_type": type(exc).__name__},
            )
            raise PHPServiceError(f"PHP API {path} returned invalid JSON") from exc
        if not isinstance(data, dict):
            logger.error(
                "PHP API returned an unexpected JSON structure",
                extra={"event": "php_unexpected_json", "method": method, "upstream_path": _safe_api_path(path),
                       "status_code": response.status_code},
            )
            raise PHPServiceError(f"PHP API {path} returned unexpected JSON")
        return data

    async def categories(self) -> list[dict[str, Any]]:
        data = await self._json("GET", "/internal/v1/knowledge/categories")
        return data.get("items", [])

    async def retrieve(self, category_slugs: list[str], limit: int = 30) -> list[dict[str, Any]]:
        data = await self._json(
            "POST",
            "/internal/v1/knowledge/retrieve",
            {"categorySlugs": category_slugs, "limit": limit},
        )
        return data.get("items", [])

    async def fetch_bytes(self, relative_url: str) -> tuple[bytes, str]:
        started = perf_counter()
        try:
            response = await self.client.get(
                self.base_url + relative_url,
                headers=self._request_headers(),
            )
        except httpx.TimeoutException as exc:
            logger.error(
                "Knowledge source download timed out",
                extra={"event": "php_download_timeout", "upstream_path": "/knowledge-source",
                       "duration_ms": round((perf_counter() - started) * 1000, 2),
                       "exception_type": type(exc).__name__},
            )
            raise
        except httpx.HTTPError as exc:
            logger.error(
                "Knowledge source download failed before receiving a response",
                extra={"event": "php_download_failed", "upstream_path": "/knowledge-source",
                       "duration_ms": round((perf_counter() - started) * 1000, 2),
                       "exception_type": type(exc).__name__},
            )
            raise PHPServiceError("Knowledge source download failed") from None

        elapsed = round((perf_counter() - started) * 1000, 2)
        if response.status_code >= 400:
            logger.error(
                "Knowledge source download returned an unsuccessful status",
                extra={"event": "php_download_http_error", "upstream_path": "/knowledge-source",
                       "status_code": response.status_code, "duration_ms": elapsed},
            )
            raise PHPServiceError(f"Cannot load knowledge source: HTTP {response.status_code}")

        content_type = response.headers.get("content-type", "application/octet-stream")
        candidate_content_type = content_type.split(";", 1)[0].strip().lower()[:80]
        safe_content_type = (
            candidate_content_type
            if re.fullmatch(r"[a-z0-9!#$&^_.+-]+/[a-z0-9!#$&^_.+-]+", candidate_content_type)
            else "application/octet-stream"
        )
        logger.info(
            "Knowledge source downloaded",
            extra={"event": "php_download_completed", "upstream_path": "/knowledge-source",
                   "status_code": response.status_code, "duration_ms": elapsed,
                   "response_bytes": len(response.content), "content_type": safe_content_type},
        )
        return response.content, content_type

    async def cache_part(self, part: dict[str, Any], content: str) -> None:
        await self._json(
            "POST",
            f"/internal/v1/knowledge/parts/{int(part['id'])}/cache",
            {
                "documentRevision": int(part["documentRevision"]),
                "partRevision": int(part["partRevision"]),
                "content": content,
            },
        )

    async def chat(self, system_prompt: str, messages: list[dict[str, str]]) -> dict[str, Any]:
        logger.info(
            "Calling internal AI Gateway",
            extra={"event": "ai_gateway_request_started", "upstream_path": "/ai/chat",
                   "message_count": len(messages), "system_prompt_chars": len(system_prompt)},
        )
        result = await self._json(
            "POST",
            "/ai/chat",
            {"systemPrompt": system_prompt, "messages": messages},
        )
        logger.info(
            "Internal AI Gateway response received",
            extra={"event": "ai_gateway_response_received", "upstream_path": "/ai/chat",
                   "answer_chars": len(str(result.get("content", "")))},
        )
        return result

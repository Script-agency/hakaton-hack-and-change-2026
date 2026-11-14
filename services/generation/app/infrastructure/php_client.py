from __future__ import annotations

from typing import Any
import httpx


class PHPServiceError(RuntimeError):
    pass


class PHPClient:
    def __init__(self, base_url: str, token: str, timeout: float = 60.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.headers = {"Authorization": f"Bearer {token}"}
        self.client = httpx.AsyncClient(timeout=httpx.Timeout(timeout, connect=8.0), headers=self.headers)

    async def close(self) -> None:
        await self.client.aclose()

    async def _json(self, method: str, path: str, payload: dict | None = None) -> dict[str, Any]:
        response = await self.client.request(method, self.base_url + path, json=payload)
        if response.status_code >= 400:
            raise PHPServiceError(f"PHP API {path} returned HTTP {response.status_code}: {response.text[:500]}")
        try:
            data = response.json()
        except ValueError as exc:
            raise PHPServiceError(f"PHP API {path} returned invalid JSON") from exc
        if not isinstance(data, dict):
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
        response = await self.client.get(self.base_url + relative_url)
        if response.status_code >= 400:
            raise PHPServiceError(f"Cannot load knowledge source: HTTP {response.status_code}")
        return response.content, response.headers.get("content-type", "application/octet-stream")

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
        return await self._json(
            "POST",
            "/internal/v1/ai/chat",
            {"systemPrompt": system_prompt, "messages": messages},
        )

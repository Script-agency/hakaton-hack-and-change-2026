from __future__ import annotations

import logging
import re
from time import perf_counter
from typing import Any

from rank_bm25 import BM25Okapi

from app.infrastructure.php_client import PHPClient
from app.knowledge.extractors import extract_document, extract_part

logger = logging.getLogger("generation.retriever")
TOKEN_RE = re.compile(r"[a-zа-яё0-9]+", re.IGNORECASE)


def tokenize(text: str) -> list[str]:
    return [token.casefold() for token in TOKEN_RE.findall(text) if len(token) > 1]


def _safe_part_id(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


class KnowledgeRetriever:
    def __init__(
        self, php: PHPClient, top_k: int, max_context_chars: int, candidate_limit: int = 30,
        chunk_size_chars: int = 3500, chunk_overlap_chars: int = 350,
    ) -> None:
        self.php = php
        self.top_k = top_k
        self.max_context_chars = max_context_chars
        self.candidate_limit = candidate_limit
        self.chunk_size_chars = chunk_size_chars
        self.chunk_overlap_chars = chunk_overlap_chars

    def _split_chunks(self, text: str) -> list[str]:
        text = text.strip()
        if len(text) <= self.chunk_size_chars:
            return [text] if text else []

        chunks: list[str] = []
        start = 0
        while start < len(text):
            end = min(len(text), start + self.chunk_size_chars)
            if end < len(text):
                # Prefer to split at a paragraph or line boundary, but avoid tiny chunks.
                boundary = text.rfind("\n", start + int(self.chunk_size_chars * 0.65), end)
                if boundary > start:
                    end = boundary
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            if end >= len(text):
                break
            next_start = max(start + 1, end - self.chunk_overlap_chars)
            # Move to the beginning of the next line if the overlap falls mid-line.
            newline = text.find("\n", next_start, min(len(text), next_start + 120))
            start = newline + 1 if newline >= 0 else next_start
        return chunks

    async def retrieve(
        self, query: str, category_slugs: list[str], top_k: int | None = None
    ) -> tuple[str, list[dict[str, Any]], dict[str, Any]]:
        started = perf_counter()
        logger.info(
            "Knowledge retrieval started",
            extra={"event": "knowledge_retrieval_started", "category_count": len(category_slugs),
                   "selected_category_count": len(category_slugs), "top_k": top_k or self.top_k},
        )
        items = await self.php.retrieve(category_slugs, self.candidate_limit)
        logger.info(
            "Knowledge candidates retrieved",
            extra={"event": "knowledge_candidates_retrieved", "candidate_parts": len(items)},
        )
        hydrated: list[dict[str, Any]] = []
        source_text_cache: dict[tuple[int, int], str] = {}
        failures: list[dict[str, Any]] = []
        inline_cache_hits = 0
        downloaded_documents = 0

        for item_index, item in enumerate(items):
            try:
                content = item.get("content")
                came_from_inline_cache = isinstance(content, str) and bool(content.strip())
                if came_from_inline_cache:
                    inline_cache_hits += 1
                if not came_from_inline_cache:
                    # Explicitly categorized part can either be a locally stored text part
                    # or a locator into the original file. Both are served by PHP internal APIs.
                    part_url = item.get("contentUrl")
                    if part_url:
                        payload, _ = await self.php.fetch_bytes(str(part_url))
                        if payload:
                            content = payload.decode("utf-8", errors="replace")
                    if not content:
                        source_key = (int(item["documentId"]), int(item["documentRevision"]))
                        full_text = source_text_cache.get(source_key)
                        if full_text is None:
                            source_bytes, _ = await self.php.fetch_bytes(str(item["documentUrl"]))
                            full_text = extract_document(source_bytes, str(item.get("extension", "")))
                            source_text_cache[source_key] = full_text
                            downloaded_documents += 1
                        content = extract_part(
                            full_text,
                            str(item.get("extension", "")),
                            str(item.get("locatorType", "whole_file")),
                            item.get("locator") or {},
                        )
                if content and str(content).strip():
                    if not came_from_inline_cache:
                        try:
                            await self.php.cache_part(item, str(content))
                        except Exception as exc:
                            # Cache is an optimization; a failed write must not block an answer.
                            logger.warning(
                                "Could not cache extracted knowledge part; continuing without cache",
                                extra={"event": "knowledge_part_cache_failed", "item_index": item_index,
                                       "part_id": _safe_part_id(item.get("id")), "exception_type": type(exc).__name__},
                            )
                    hydrated.append({**item, "content": str(content).strip()})
            except Exception as exc:
                failures.append({"partId": item.get("id"), "reason": str(exc)[:250]})
                logger.exception(
                    "Knowledge part could not be loaded",
                    extra={"event": "knowledge_part_load_failed", "item_index": item_index,
                           "part_id": _safe_part_id(item.get("id")), "exception_type": type(exc).__name__},
                )

        if not hydrated:
            elapsed = round((perf_counter() - started) * 1000, 2)
            logger.warning(
                "Knowledge retrieval completed without usable parts",
                extra={"event": "knowledge_retrieval_completed", "candidate_parts": len(items),
                       "loaded_parts": 0, "chunk_count": 0, "selected_parts": 0,
                       "failed_parts": len(failures), "duration_ms": elapsed,
                       "downloaded_documents": downloaded_documents,
                       "inline_cache_hits": inline_cache_hits},
            )
            return "", [], {"candidateParts": len(items), "loadedParts": 0, "chunkCount": 0, "failedParts": failures}

        chunked: list[dict[str, Any]] = []
        for part in hydrated:
            for chunk_index, chunk_text in enumerate(self._split_chunks(part["content"])):
                chunked.append({**part, "content": chunk_text, "chunkIndex": chunk_index})

        ranking_started = perf_counter()
        corpus = [tokenize(f"{part.get('title', '')} {part.get('description') or ''} {part.get('documentTitle', '')} {part['content']}") for part in chunked]
        query_tokens = tokenize(query)
        scores = BM25Okapi(corpus).get_scores(query_tokens) if query_tokens and any(corpus) else [0.0] * len(chunked)
        ranked = sorted(zip(scores, chunked), key=lambda pair: pair[0], reverse=True)
        # If no lexical match is present, keep stable order from the category-filtered index.
        if not any(score > 0 for score, _ in ranked):
            ranked = [(0.0, part) for part in chunked]
        selected = [part for _, part in ranked[: (top_k or self.top_k)]]
        ranking_ms = round((perf_counter() - ranking_started) * 1000, 2)

        contexts: list[str] = []
        sources: list[dict[str, Any]] = []
        used_chars = 0
        for index, part in enumerate(selected, start=1):
            content = part["content"]
            remaining = self.max_context_chars - used_chars
            if remaining <= 0:
                break
            content = content[:remaining]
            source = {
                "id": int(part["id"]),
                "document_id": int(part["documentId"]),
                "title": str(part.get("title") or part.get("documentTitle") or "Без названия"),
                "filename": str(part.get("filename") or ""),
                "category": str((part.get("category") or {}).get("name", "")),
                "locator_type": str(part.get("locatorType", "whole_file")),
                "locator": part.get("locator") or {},
                "chunk_index": int(part.get("chunkIndex", 0)),
            }
            locator_label = self._locator_label(source["locator_type"], source["locator"])
            contexts.append(
                f"[Источник {index}]\n"
                f"Документ: {part.get('documentTitle')} ({source['filename']})\n"
                f"Раздел: {source['title']}\n"
                f"Категория: {source['category']}\n"
                f"Расположение: {locator_label}\n"
                f"Содержимое:\n{content}"
            )
            used_chars += len(content)
            sources.append(source)

        debug = {
            "candidateParts": len(items),
            "loadedParts": len(hydrated),
            "chunkCount": len(chunked),
            "selectedParts": len(sources),
            "failedParts": failures,
            "contextChars": used_chars,
        }
        elapsed = round((perf_counter() - started) * 1000, 2)
        logger.info(
            "Knowledge retrieval completed",
            extra={"event": "knowledge_retrieval_completed", "candidate_parts": len(items),
                   "loaded_parts": len(hydrated), "chunk_count": len(chunked),
                   "selected_parts": len(sources), "failed_parts": len(failures),
                   "context_chars": used_chars, "duration_ms": elapsed,
                   "downloaded_documents": downloaded_documents,
                   "inline_cache_hits": inline_cache_hits,
                   "ranking_duration_ms": ranking_ms,
                   "query_token_count": len(query_tokens),
                   "cache_hit": inline_cache_hits > 0},
        )
        logger.debug(
            "Knowledge retrieval performance details",
            extra={"event": "knowledge_retrieval_performance", "duration_ms": elapsed,
                   "downloaded_documents": downloaded_documents, "inline_cache_hits": inline_cache_hits,
                   "ranking_duration_ms": ranking_ms},
        )
        return "\n\n---\n\n".join(contexts), sources, debug

    @staticmethod
    def _locator_label(locator_type: str, locator: dict[str, Any]) -> str:
        if locator_type == "heading":
            return f"заголовок: {locator.get('heading', '')}"
        if locator_type in {"page_range", "line_range"}:
            return f"{locator_type}: {locator.get('start')}–{locator.get('end')}"
        return "весь документ"

from __future__ import annotations

import asyncio
# The retrieval-flow tests do not test BM25 scoring itself. Use a stable test double
# only when the optional runtime package is absent from the local test environment.
import sys
import types

try:
    import rank_bm25  # noqa: F401
except ModuleNotFoundError:
    module = types.ModuleType("rank_bm25")

    class _BM25TestDouble:
        def __init__(self, corpus):
            self.size = len(corpus)

        def get_scores(self, query_tokens):
            return [0.0] * self.size

    module.BM25Okapi = _BM25TestDouble
    sys.modules["rank_bm25"] = module

from app.knowledge.retriever import KnowledgeRetriever


class FakePHP:
    def __init__(self, items: list[dict], files: dict[str, bytes] | None = None) -> None:
        self.items = items
        self.files = files or {}
        self.cached: list[tuple[int, str]] = []
        self.fetches: list[str] = []

    async def retrieve(self, category_slugs: list[str], limit: int = 30):
        return self.items

    async def fetch_bytes(self, url: str):
        self.fetches.append(url)
        return self.files[url], "application/octet-stream"

    async def cache_part(self, part: dict, content: str):
        self.cached.append((int(part["id"]), content))


def _part(**overrides):
    value = {
        "id": 1,
        "documentId": 10,
        "documentRevision": 2,
        "partRevision": 3,
        "title": "Электроснабжение",
        "documentTitle": "Инструкция",
        "filename": "guide.md",
        "category": {"name": "Энергетика", "slug": "10-energy"},
        "locatorType": "heading",
        "locator": {"heading": "Тарифы"},
        "extension": "md",
        "contentUrl": "/parts/1/content",
        "documentUrl": "/documents/10/file",
    }
    value.update(overrides)
    return value


def test_redis_inline_content_does_not_download_source():
    php = FakePHP([_part(content="# Cached\nТарифы и стоимость")])
    retriever = KnowledgeRetriever(php, top_k=2, max_context_chars=4000)

    context, sources, debug = asyncio.run(retriever.retrieve("тарифы", ["10-energy"]))

    assert "Тарифы и стоимость" in context
    assert sources[0]["id"] == 1
    assert php.fetches == []
    assert debug["loadedParts"] == 1


def test_file_locator_is_extracted_then_cached():
    php = FakePHP(
        [_part()],
        {"/parts/1/content": b"", "/documents/10/file": "# Overview\nintro\n\n## Тарифы\nТарифы и стоимость\n\n## Учёт\nСчётчики".encode("utf-8")},
    )
    retriever = KnowledgeRetriever(php, top_k=2, max_context_chars=4000)

    context, sources, _ = asyncio.run(retriever.retrieve("тарифы", ["10-energy"]))

    assert "Тарифы и стоимость" in context
    assert "Счётчики" not in context
    assert php.cached == [(1, "## Тарифы\nТарифы и стоимость")]
    assert php.fetches == ["/parts/1/content", "/documents/10/file"]


def test_long_knowledge_part_is_split_into_overlapping_chunks():
    retriever = KnowledgeRetriever(FakePHP([]), top_k=3, max_context_chars=4000, chunk_size_chars=40, chunk_overlap_chars=8)
    chunks = retriever._split_chunks("paragraph one\nparagraph two\nparagraph three\nparagraph four")

    assert len(chunks) >= 2
    assert all(chunks)
    assert "paragraph one" in chunks[0]
    assert "paragraph four" in " ".join(chunks)

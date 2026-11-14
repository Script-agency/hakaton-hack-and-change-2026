from __future__ import annotations

import asyncio
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

from app.schemas import GenerationRequest
from app.orchestration.generation_service import GenerationService


class FakePHP:
    def __init__(self):
        self.sent_messages = None

    async def categories(self):
        return [{"slug": "general", "name": "Общее"}]

    async def retrieve(self, category_slugs, limit=30):
        return []

    async def chat(self, system_prompt, messages):
        self.sent_messages = messages
        return {"content": "Ответ"}


def test_chat_history_envelope_is_accepted_and_metadata_is_not_forwarded():
    payload = GenerationRequest.model_validate({
        "question": "Продолжим?",
        "conversation_id": "conv_123",
        "context": [],
        "chat_messages": {
            "id": 1,
            "fingerprint": "abc",
            "created_at": "2026-11-14 14:24:51",
            "messages": [
                {"id": 10, "chat_id": 1, "role": "user", "content": "Первый вопрос", "created_at": "2026-11-14 14:33:10"},
                {"id": 11, "chat_id": 1, "role": "assistant", "content": "Первый ответ", "created_at": "2026-11-14 14:33:12"},
            ],
        },
    })
    assert payload.history_message_count == 2
    php = FakePHP()
    service = GenerationService(php, top_k=2, max_context_chars=4000)

    asyncio.run(service.answer(payload))

    assert php.sent_messages == [
        {"role": "user", "content": "Первый вопрос"},
        {"role": "assistant", "content": "Первый ответ"},
        {"role": "user", "content": "Продолжим?"},
    ]


def test_legacy_messages_are_still_supported_and_current_question_is_not_duplicated():
    payload = GenerationRequest.model_validate({
        "question": "Последний вопрос",
        "messages": [
            {"role": "user", "content": "Предыдущий вопрос"},
            {"role": "assistant", "content": "Предыдущий ответ"},
            {"role": "user", "content": "Последний вопрос", "created_at": "2026-11-14"},
        ],
    })
    php = FakePHP()
    service = GenerationService(php, top_k=2, max_context_chars=4000)

    asyncio.run(service.answer(payload))

    assert len(php.sent_messages) == 3
    assert php.sent_messages[-1] == {"role": "user", "content": "Последний вопрос"}


def test_chat_history_keeps_only_latest_twenty_messages():
    history = [{"role": "user", "content": f"Вопрос {i}"} for i in range(25)]
    payload = GenerationRequest.model_validate({
        "question": "Новый вопрос",
        "chat_messages": {"id": 1, "messages": history},
    })
    php = FakePHP()
    service = GenerationService(php, top_k=2, max_context_chars=4000)

    asyncio.run(service.answer(payload))

    assert len(php.sent_messages) == 20
    assert php.sent_messages[0]["content"] == "Вопрос 6"
    assert php.sent_messages[-1]["content"] == "Новый вопрос"

# Generation Service

Internal FastAPI service for request routing, knowledge retrieval, context assembly and AI Gateway calls.

## Request flow

`POST /generation/chat` (PHP public proxy) → Python category router → PHP Knowledge API → Redis-cached part or internal file URL → Python extractor → overlapping text chunks → BM25 ranking → context → PHP AI Gateway → answer + sources.

Python does not connect directly to PostgreSQL or read the PHP volume. Original documents remain in the PHP local filesystem; Python obtains a document through authenticated internal HTTP endpoints. Extracted part text may be cached in Redis by PHP using a key tied to both document and part revisions.

## Run locally

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
export PHP_INTERNAL_API_URL=http://localhost:8080
export INTERNAL_SERVICE_TOKEN=your-internal-token
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

## Import the supplied categorized corpus

```bash
python scripts/import_knowledge_base.py ../../knowledge-base \
  --base-url http://localhost:8080 \
  --token "$KNOWLEDGE_ADMIN_TOKEN" \
  --publish
```

The ZIP or directory must contain `category-folder/document.ext` (a single wrapper directory is accepted). Each imported document receives an initial `whole_file` knowledge part in the matching category. Use `--skip-existing` for a checksum-based idempotent import. Administrators can then split it into multiple parts and assign different categories using the admin API.

## Tests

```bash
python -m pytest
```

## Chat history input

`POST /v1/generation/chat` accepts the full chat object from PHP in `chat_messages`.
The envelope metadata (`id`, `fingerprint`, `created_at`) and per-message database
metadata (`id`, `chat_id`, `created_at`) are accepted but are not sent to the AI Gateway.
Only each message's `role` and `content` are forwarded.

```json
{
  "question": "Продолжим обсуждение?",
  "conversation_id": "conv_01HXYZ",
  "context": [],
  "chat_messages": {
    "id": 1,
    "fingerprint": "a1b2c3d4e5f6",
    "created_at": "2026-11-14 14:24:51",
    "messages": [
      {"id": 1, "chat_id": 1, "role": "user", "content": "Первый вопрос", "created_at": "2026-11-14 14:33:10"},
      {"id": 2, "chat_id": 1, "role": "assistant", "content": "Первый ответ", "created_at": "2026-11-14 14:33:12"}
    ]
  }
}
```

The current `question` is appended as the last user message unless it is already
the last message in the supplied history. The latest 20 messages are sent to the
AI Gateway. The previous flat `messages: [{role, content}]` input remains supported;
when both forms are supplied, `chat_messages.messages` takes precedence.

## Structured JSON logging

The service writes technical JSON logs to `/app/logs/generation.log`, with 10 MiB
rotation and 10 backups. In Docker, mount `./services/generation/logs:/app/logs`
and set the `GENERATION_LOG_*` environment variables shown in
[the logging guide](docs/LOGGING.md). The logger records technical metadata only;
question/answer text, chat contents, prompts, document contents and credentials
are not written to logs.

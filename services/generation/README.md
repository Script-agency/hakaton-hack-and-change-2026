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
pytest
```

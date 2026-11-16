from __future__ import annotations

from contextvars import ContextVar
from datetime import datetime, timezone
import json
import logging
from logging.handlers import RotatingFileHandler
import os
from pathlib import Path
import sys
import traceback
from typing import Any
from uuid import UUID, uuid4


_request_id: ContextVar[str] = ContextVar("generation_request_id", default="-")

# Deliberately restricted to operational metadata. Request/response bodies,
# prompts, document text, credentials and raw HTTP headers are never serialized.
# X-Request-ID is normalized to a UUID before it can enter a log record.
_LOG_FIELDS = (
    "event",
    "log_file",
    "log_level",
    "log_max_bytes",
    "log_backup_count",
    "request_id",
    "method",
    "path",
    "status_code",
    "duration_ms",
    "ranking_duration_ms",
    "downloaded_documents",
    "inline_cache_hits",
    "query_token_count",
    "exception_type",
    "upstream_path",
    "category_count",
    "selected_category_count",
    "routing_mode",
    "candidate_parts",
    "loaded_parts",
    "chunk_count",
    "selected_parts",
    "failed_parts",
    "context_chars",
    "question_chars",
    "message_count",
    "top_k",
    "debug_enabled",
    "system_prompt_chars",
    "answer_chars",
    "source_count",
    "response_bytes",
    "content_type",
    "item_index",
    "part_id",
    "cache_hit",
    "history_source",
)


class RequestContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if not getattr(record, "request_id", None):
            record.request_id = _request_id.get()
        return True


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
            "level": record.levelname,
            "logger": record.name,
            # All application log messages are static descriptions, never request data.
            "message": record.getMessage()[:256],
        }
        for field in _LOG_FIELDS:
            value = getattr(record, field, None)
            if value is None:
                continue
            # Only short scalar values are allowed into JSON logs. This prevents
            # accidental serialization of request bodies, response objects,
            # lists, mappings, or arbitrary third-party objects in extra= fields.
            if isinstance(value, str):
                payload[field] = value[:256]
            elif type(value) in (int, float, bool):
                payload[field] = value
        if record.exc_info:
            exc_type, _exc_value, exc_traceback = record.exc_info
            # Keep the complete stack frames and exception type, but deliberately
            # omit exception messages because third-party errors can echo payloads.
            frames = traceback.extract_tb(exc_traceback) if exc_traceback else []
            stack = "".join(
                f'  File "{frame.filename}", line {frame.lineno}, in {frame.name}\n'
                for frame in frames
            )
            payload["exception"] = f"Traceback (most recent call last):\n{stack}{exc_type.__name__}: [message omitted]"
        return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def normalize_request_id(value: str | None) -> str:
    """Accept only UUID-shaped caller IDs; otherwise create a safe server ID."""
    if value:
        try:
            return UUID(value).hex
        except (ValueError, TypeError, AttributeError):
            pass
    return uuid4().hex


def get_request_id() -> str:
    return _request_id.get()


def set_request_id(value: str):
    return _request_id.set(value)


def reset_request_id(token: Any) -> None:
    _request_id.reset(token)


def configure_logging(
    *,
    log_file: str | Path | None = None,
    level: str | None = None,
    max_bytes: int | None = None,
    backup_count: int | None = None,
    logger_name: str = "generation",
) -> logging.Logger:
    """Configure JSON logs to a rotating file and stdout."""
    destination = Path(log_file or os.getenv("GENERATION_LOG_FILE", "logs/generation.log"))
    resolved_level = (level or os.getenv("GENERATION_LOG_LEVEL", "INFO")).upper()
    numeric_level = getattr(logging, resolved_level, logging.INFO)
    rotation_bytes = max_bytes if max_bytes is not None else int(os.getenv("GENERATION_LOG_MAX_BYTES", str(10 * 1024 * 1024)))
    rotations = backup_count if backup_count is not None else int(os.getenv("GENERATION_LOG_BACKUP_COUNT", "10"))

    destination.parent.mkdir(parents=True, exist_ok=True)
    formatter = JSONFormatter()
    context_filter = RequestContextFilter()

    logger = logging.getLogger(logger_name)
    logger.setLevel(numeric_level)
    logger.propagate = False

    # Reconfiguration is safe (e.g. in tests or embedded deployments).
    for handler in list(logger.handlers):
        logger.removeHandler(handler)
        handler.close()

    file_handler = RotatingFileHandler(
        destination,
        maxBytes=max(1, rotation_bytes),
        backupCount=max(0, rotations),
        encoding="utf-8",
        delay=True,
    )
    file_handler.setLevel(numeric_level)
    file_handler.setFormatter(formatter)
    file_handler.addFilter(context_filter)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)
    console_handler.setFormatter(formatter)
    console_handler.addFilter(context_filter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    return logger

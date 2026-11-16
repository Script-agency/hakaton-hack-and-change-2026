from __future__ import annotations

import json
import logging

from app.logging_config import (
    JSONFormatter, configure_logging, normalize_request_id,
    reset_request_id, set_request_id,
)
from app.infrastructure.php_client import _safe_api_path


def test_json_formatter_uses_structured_metadata_and_not_payload_fields() -> None:
    record = logging.LogRecord(
        name="generation.test", level=logging.INFO, pathname=__file__, lineno=1,
        msg="Generation request accepted", args=(), exc_info=None,
    )
    record.event = "generation_request_accepted"
    record.question_chars = 42
    record.question = "private question text"
    record.answer = "private answer text"
    record.selected_category_count = 2
    record.selected_categories = ["private category metadata"]
    record.usage = {"prompt": "private prompt content"}

    encoded = JSONFormatter().format(record)
    parsed = json.loads(encoded)

    assert parsed["event"] == "generation_request_accepted"
    assert parsed["question_chars"] == 42
    assert "question" not in parsed
    assert "answer" not in parsed
    assert "private question text" not in encoded
    assert "private answer text" not in encoded
    assert parsed["selected_category_count"] == 2
    assert "selected_categories" not in parsed
    assert "usage" not in parsed
    assert "private prompt content" not in encoded


def test_request_id_is_added_to_json_logs(tmp_path) -> None:
    log_path = tmp_path / "generation.log"
    logger = configure_logging(log_file=log_path, logger_name="test-generation-request-id")
    token = set_request_id("req-123")
    try:
        logger.info("Test request", extra={"event": "test_request"})
    finally:
        reset_request_id(token)
        for handler in logger.handlers:
            handler.flush()

    parsed = json.loads(log_path.read_text(encoding="utf-8").splitlines()[0])
    assert parsed["request_id"] == "req-123"


def test_rotating_file_handler_is_configured(tmp_path) -> None:
    log_path = tmp_path / "generation.log"
    logger = configure_logging(
        log_file=log_path,
        level="INFO",
        max_bytes=1,
        backup_count=2,
        logger_name="test-generation-rotation",
    )
    logger.info("First record")
    logger.info("Second record")
    for handler in logger.handlers:
        handler.flush()

    assert log_path.exists()
    assert (tmp_path / "generation.log.1").exists()


def test_exception_formatter_keeps_stack_but_omits_exception_message() -> None:
    try:
        raise RuntimeError("sensitive response body")
    except RuntimeError:
        record = logging.LogRecord(
            name="generation.test", level=logging.ERROR, pathname=__file__, lineno=1,
            msg="Operation failed", args=(), exc_info=__import__("sys").exc_info(),
        )

    parsed = json.loads(JSONFormatter().format(record))
    assert "RuntimeError" in parsed["exception"]
    assert "test_exception_formatter" in parsed["exception"]
    assert "sensitive response body" not in parsed["exception"]


def test_request_id_accepts_only_uuid_values() -> None:
    assert normalize_request_id("550e8400-e29b-41d4-a716-446655440000") == "550e8400e29b41d4a716446655440000"
    generated = normalize_request_id("user@example.com")
    assert len(generated) == 32
    assert all(char in "0123456789abcdef" for char in generated)


def test_php_endpoint_logging_uses_safe_route_templates() -> None:
    assert _safe_api_path("/internal/v1/knowledge/parts/123/cache?token=private") == "/internal/v1/knowledge/parts/{id}/cache"
    assert _safe_api_path("/path/that/contains/private-data") == "/internal-api"

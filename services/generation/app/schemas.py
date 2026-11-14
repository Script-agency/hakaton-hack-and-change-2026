from __future__ import annotations

from typing import Any, Literal
from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class Message(BaseModel):
    # Database metadata (id, chat_id, created_at, attachments, etc.) is accepted
    # by Pydantic but deliberately not forwarded to the AI Gateway.
    model_config = ConfigDict(extra="ignore")

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=12000)


class ChatHistory(BaseModel):
    """History envelope supplied by PHP as `chat_messages`."""
    model_config = ConfigDict(extra="allow")

    id: int | str | None = None
    fingerprint: str | None = None
    created_at: str | None = None
    messages: list[Message] = Field(default_factory=list, max_length=200)


class GenerationRequest(BaseModel):
    question: str = Field(min_length=1, max_length=12000)
    # Legacy flat message history remains supported for backward compatibility.
    messages: list[Message] = Field(default_factory=list, max_length=200)
    # Full chat object from PHP. Takes precedence over legacy `messages` when supplied.
    chat_messages: ChatHistory | None = Field(
        default=None,
        validation_alias=AliasChoices("chat_messages", "chatMessages"),
    )
    category_slugs: list[str] | None = Field(default=None, validation_alias=AliasChoices("category_slugs", "categorySlugs"))
    top_k: int | None = Field(default=None, ge=1, le=12)
    debug: bool = False

    @property
    def history_message_count(self) -> int:
        history = self.chat_messages.messages if self.chat_messages is not None else self.messages
        return len(history)


class Source(BaseModel):
    id: int
    document_id: int
    title: str
    filename: str
    category: str
    locator_type: str
    locator: dict
    chunk_index: int = 0


class GenerationResponse(BaseModel):
    answer: str
    sources: list[Source]
    routing: dict
    debug: dict | None = None

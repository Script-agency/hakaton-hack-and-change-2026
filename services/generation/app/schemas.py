from __future__ import annotations

from typing import Literal
from pydantic import AliasChoices, BaseModel, Field


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=12000)


class GenerationRequest(BaseModel):
    question: str = Field(min_length=1, max_length=12000)
    messages: list[Message] = Field(default_factory=list, max_length=40)
    category_slugs: list[str] | None = Field(default=None, validation_alias=AliasChoices("category_slugs", "categorySlugs"))
    top_k: int | None = Field(default=None, ge=1, le=12)
    debug: bool = False


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

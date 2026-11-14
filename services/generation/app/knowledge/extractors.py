from __future__ import annotations

from io import BytesIO
import re
from typing import Any

from bs4 import BeautifulSoup
from docx import Document
from pypdf import PdfReader


def extract_document(data: bytes, extension: str) -> str:
    ext = extension.lower().lstrip(".")
    if ext in {"md", "txt"}:
        return data.decode("utf-8-sig", errors="replace")
    if ext in {"html", "htm"}:
        soup = BeautifulSoup(data, "lxml")
        for node in soup(["script", "style", "noscript", "svg"]):
            node.decompose()
        return soup.get_text("\n", strip=True)
    if ext == "pdf":
        reader = PdfReader(BytesIO(data))
        pages = []
        extracted_pages = []
        for index, page in enumerate(reader.pages, start=1):
            page_text = (page.extract_text() or "").strip()
            if page_text:
                extracted_pages.append(f"[Страница {index}]\n{page_text}")
        if not extracted_pages:
            raise ValueError("PDF has no extractable text; OCR is not enabled in the MVP")
        return "\n\n".join(extracted_pages)
    if ext == "docx":
        doc = Document(BytesIO(data))
        blocks = [p.text for p in doc.paragraphs if p.text.strip()]
        for table in doc.tables:
            for row in table.rows:
                blocks.append(" | ".join(cell.text.strip().replace("\n", " ") for cell in row.cells))
        return "\n".join(blocks)
    raise ValueError(f"Unsupported source extension: {ext}")


def extract_part(text: str, extension: str, locator_type: str, locator: dict[str, Any]) -> str:
    if locator_type == "whole_file":
        return text.strip()
    if locator_type == "page_range":
        if extension.lower() != "pdf":
            raise ValueError("page_range locator can only be used with PDF files")
        start, end = int(locator.get("start", 1)), int(locator.get("end", 1))
        page_blocks = re.split(r"(?=\[Страница \d+\])", text)
        selected = []
        for block in page_blocks:
            match = re.match(r"\[Страница (\d+)\]", block)
            if match and start <= int(match.group(1)) <= end:
                selected.append(block)
        return "\n\n".join(selected).strip()
    if locator_type == "line_range":
        lines = text.splitlines()
        start, end = int(locator.get("start", 1)), int(locator.get("end", len(lines)))
        return "\n".join(lines[max(0, start - 1):end]).strip()
    if locator_type == "heading":
        expected = re.sub(r"\s+", " ", str(locator.get("heading", "")).strip()).casefold()
        if not expected:
            raise ValueError("heading locator is empty")
        lines = text.splitlines()
        start_index = None
        heading_level = 6
        for index, line in enumerate(lines):
            match = re.match(r"^(#{1,6})\s+(.+?)\s*#*\s*$", line.strip())
            if match and re.sub(r"\s+", " ", match.group(2)).casefold() == expected:
                start_index = index
                heading_level = len(match.group(1))
                break
        if start_index is None:
            # For plain text and extracted docx, tolerate a standalone exact heading line.
            for index, line in enumerate(lines):
                if re.sub(r"\s+", " ", line.strip()).casefold() == expected:
                    start_index = index
                    break
        if start_index is None:
            raise ValueError("Heading not found in source file")
        end_index = len(lines)
        for index in range(start_index + 1, len(lines)):
            match = re.match(r"^(#{1,6})\s+", lines[index].strip())
            if match and len(match.group(1)) <= heading_level:
                end_index = index
                break
        return "\n".join(lines[start_index:end_index]).strip()
    raise ValueError(f"Unsupported locator type: {locator_type}")

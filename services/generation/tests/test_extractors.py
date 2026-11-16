from app.knowledge.extractors import extract_document, extract_part


def test_heading_part_extracts_only_section() -> None:
    source = "# Overview\nintro\n\n## Billing\nprice info\n\n## Metering\nmeter info"
    result = extract_part(source, "md", "heading", {"heading": "Billing"})
    assert "price info" in result
    assert "meter info" not in result


def test_line_range_is_one_based_inclusive() -> None:
    source = "one\ntwo\nthree\nfour"
    assert extract_part(source, "txt", "line_range", {"start": 2, "end": 3}) == "two\nthree"


def test_markdown_document_decodes_utf8() -> None:
    assert extract_document("Привет".encode(), "md") == "Привет"

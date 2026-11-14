from app.knowledge.router import KnowledgeRouter


def test_router_selects_energy_category() -> None:
    categories = [
        {"slug": "00-reference", "name": "Справочные материалы"},
        {"slug": "10-energy", "name": "Энергетика"},
        {"slug": "20-products", "name": "Продукты"},
    ]
    selected, result = KnowledgeRouter().route("Как рассчитывается тариф на электроэнергию?", categories)
    assert "10-energy" in selected
    assert result["mode"] == "keyword"


def test_router_falls_back_to_all_categories() -> None:
    categories = [{"slug": "general", "name": "Общее"}, {"slug": "other", "name": "Другое"}]
    selected, result = KnowledgeRouter().route("Непонятный вопрос", categories)
    assert selected == ["general", "other"]
    assert result["mode"] == "fallback_all"

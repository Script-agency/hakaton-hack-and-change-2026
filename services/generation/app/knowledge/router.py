from __future__ import annotations

import re
from typing import Any


# Rules are deliberately conservative: when no category is clearly relevant,
# all active categories are searched instead of silently narrowing the corpus.
CATEGORY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "00-reference": (
        "расчет", "расчёт", "окупаем", "стоимость", "стоить", "оценк", "цена", "выгод", "показател",
        "цифр", "срок", "эконом", "эффект", "модель", "заявк", "вводные", "предваритель",
    ),
    "10-energy": (
        "энерг", "электр", "тариф", "рынок", "счет", "счёт", "счетчик", "счётчик",
        "мощност", "реактив", "потреблен", "потреблён", "потер", "учет", "учёт",
        "категор", "микрогенерац", "гарантирующ", "сетев",
    ),
    "20-products": (
        "продукт", "платформ", "сервис", "кабинет", "аскуэ", "мониторинг", "солнеч", "панел",
        "станц", "накопител", "счетчик", "счётчик", "фото", "распознав", "energytool",
    ),
}


def _norm(value: str) -> str:
    return re.sub(r"[^a-zа-яё0-9]+", " ", value.lower()).strip()


class KnowledgeRouter:
    def route(self, query: str, categories: list[dict[str, Any]], forced: list[str] | None = None) -> tuple[list[str], dict[str, Any]]:
        available = [str(item.get("slug", "")) for item in categories if item.get("slug")]
        if forced:
            selected = [slug for slug in forced if slug in available]
            if selected:
                return selected, {"mode": "explicit", "selected": selected}

        text = _norm(query)
        scores: dict[str, int] = {}
        for category in categories:
            slug = str(category.get("slug", ""))
            score = 0
            for keyword in CATEGORY_KEYWORDS.get(slug, ()):
                if _norm(keyword) in text:
                    score += 1
            # Custom categories can still be selected through their name/description.
            for part in (category.get("name", ""), category.get("description", "")):
                normalized = _norm(str(part))
                if normalized and any(token in text for token in normalized.split() if len(token) > 3):
                    score += 1
            scores[slug] = score

        ranked = sorted(((score, slug) for slug, score in scores.items() if score > 0), reverse=True)
        if not ranked:
            return available, {"mode": "fallback_all", "selected": available, "scores": scores}

        max_score = ranked[0][0]
        selected = [slug for score, slug in ranked if score >= max(1, max_score - 1)]
        return selected or available, {"mode": "keyword", "selected": selected, "scores": scores}

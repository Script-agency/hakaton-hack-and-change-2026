# Сервис генерации (Generation Service)

## Обзор

Сервис генерации (`services/generation`) — внутренний микросервис на FastAPI (Python) для обработки запросов от AI-ассистента. Он принимает вопрос пользователя, выполняет роутинг по категориям знаний, извлекает релевантный контент из базы знаний, ранжирует его и отправляет в AI Gateway для генерации ответа.

**Архитектурный паттерн:** Простая слоистая архитектура (Orchestration → Knowledge → Infrastructure) с центральным сервисом-оркестратором `GenerationService`.

**Ключевые возможности:**

- Приём вопросов от пользователей через `POST /v1/generation/chat`
- Автоматический роутинг по категориям знаний на основе ключевых слов (или явное указание категорий)
- Извлечение контента из документов (PDF, DOCX, HTML, MD/TXT) с поддержкой локаторов (`whole_file`, `heading`, `page_range`, `line_range`)
- Чанкинг текста (3500 символов, 350 перекрытие) с ранжированием BM25
- Сборка контекста в system_prompt и вызов AI Gateway для генерации ответа
- Поддержка отладочного режима (возврат debug-информации по retrieval и AI)
- Graceful degradation при недоступности кэша или ошибках отдельных документов

## Содержание документации

| Документ                         | Описание                                                         |
|----------------------------------|------------------------------------------------------------------|
| [README](README.md)              | Назначение, обзор, состав документации (данный файл)             |
| [ARCHITECT.md](ARCHITECT.md)     | Архитектура — слои, компоненты, поток вызова, схемы              |
| [CAPABILITIES.md](CAPABILITIES.md) | Функциональные возможности, API-эндпоинты, примеры              |
| [SCALING.md](SCALING.md)         | Масштабирование, производительность, узкие места                  |
| [ADMIN.md](ADMIN.md)             | Администрирование — ENV-переменные, конфигурация, мониторинг     |
| [TECH_DEBT.md](TECH_DEBT.md)     | Известные проблемы, техдолг, ограничения и Roadmap               |

## Структура сервиса

```
services/generation/
├── Dockerfile                          # Сборка Docker-образа
├── README.md                           # Оригинальный README сервиса
├── requirements.txt                    # Зависимости runtime
├── requirements-dev.txt                # Зависимости для разработки/тестов
├── app/
│   ├── main.py                         # Точка входа FastAPI, lifespan, эндпоинты
│   ├── config.py                       # ENV-конфигурация сервиса
│   ├── schemas.py                      # Pydantic-схемы (request/response)
│   ├── orchestration/
│   │   └── generation_service.py       # GenerationService — оркестратор
│   ├── knowledge/
│   │   ├── router.py                   # KnowledgeRouter — роутинг по категориям
│   │   ├── retriever.py                # KnowledgeRetriever — загрузка, чанкинг, BM25
│   │   └── extractors.py              # Извлечение текста из PDF/DOCX/HTML/TXT
│   └── infrastructure/
│       └── php_client.py               # PHPClient — HTTP-клиент к PHP-бэкенду
├── scripts/
│   ├── import_knowledge_base.py        # Импорт подготовленной базы знаний
│   └── data/                           # Эталонные тексты для RAG (markdown)
└── tests/
    ├── evaluation/                     # Тестовые вопросы для оценки качества
    ├── test_extractors.py
    ├── test_retriever.py
    └── test_router.py
```

## Быстрый старт

### 1. Локальный запуск

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

export PHP_INTERNAL_API_URL=http://localhost:8080
export INTERNAL_SERVICE_TOKEN=your-internal-token
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Проверка health endpoint

```bash
curl http://localhost:8000/health
# {"status": "ok", "service": "generation"}
```

### 3. Отправка вопроса

```bash
curl -X POST http://localhost:8000/v1/generation/chat \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Какие продукты подходят для учёта электроэнергии?",
    "messages": [],
    "debug": true
  }'
```

## Зависимости

- **FastAPI** — веб-фреймворк
- **httpx** — асинхронный HTTP-клиент к PHP-бэкенду
- **rank_bm25** — BM25-ранжирование текстовых чанков
- **pypdf** — извлечение текста из PDF
- **python-docx** — извлечение текста из DOCX
- **beautifulsoup4** — извлечение текста из HTML
- **Pydantic** — валидация схем запроса/ответа

---
# Архитектура сервиса генерации

## Общая архитектура

Сервис генерации — это Python FastAPI-микросервис, выступающий оркестратором между PHP-бэкендом (знания + AI Gateway) и AI-ассистентом. Он не имеет собственной базы данных и не работает с файловой системой напрямую — все данные получает через внутренние HTTP-эндпоинты PHP-бэкенда.

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHP Backend (Yii)                            │
│  ┌─────────────────────┐  ┌──────────────────┐                 │
│  │ Knowledge API       │  │ AI Gateway       │                 │
│  │ (категории, retrieve,│  │ (OpenAI proxy)   │                 │
│  │  файлы, кэш)        │  └──────────────────┘                 │
│  └──────────┬──────────┘                                       │
└─────────────┼───────────────────────────────────────────────────┘
              │ HTTP (внутренняя сеть)
┌─────────────▼───────────────────────────────────────────────────┐
│              Python Generation Service (:8000)                   │
│                                                                  │
│  ┌──────────┐   ┌──────────────────────┐   ┌─────────────────┐  │
│  │ FastAPI  │   │  GenerationService   │   │  PHPClient      │  │
│  │ main.py  │──▶│  (оркестратор)       │──▶│  (httpx)        │  │
│  └──────────┘   └──┬───────┬───────────┘   └─────────────────┘  │
│                    │       │                                     │
│              ┌─────▼──┐ ┌──▼──────────────┐                    │
│              │ Router │ │ Retriever       │                    │
│              │ (rou-  │ │ - загрузка      │                    │
│              │  te()) │ │ - экстракция    │                    │
│              └────────┘ │ - чанкинг       │                    │
│                         │ - BM25          │                    │
│                         └─────────────────┘                    │
├─────────────────────────────────────────────────────────────────┤
│                     Внешние библиотеки                           │
│  httpx  rank_bm25  pypdf  python-docx  beautifulsoup4            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Компоненты и их ответственность

### FastAPI App (`app/main.py`)

Точка входа. Инициализирует `PHPClient` и `GenerationService` в `lifespan`, определяет маршруты.

| Маршрут                  | Метод | Описание                                |
|---------------------------|-------|-----------------------------------------|
| `/health`                | GET   | Health check (статус сервиса)           |
| `/v1/generation/chat`    | POST  | Основной эндпоинт генерации ответа      |

**Обработка ошибок:**

| Исключение              | HTTP-код | Условие                                        |
|--------------------------|----------|-------------------------------------------------|
| `PHPServiceError`        | 502      | PHP-бэкенд вернул ошибку или невалидный ответ   |
| `httpx.TimeoutException` | 504      | Таймаут внутреннего запроса к PHP               |
| `HTTPException`          | (проброс)| Известные HTTP-ошибки (400, 404 и т.д.)         |
| `Exception`              | 500      | Внутренняя ошибка (логируется в файл и stdout)          |

### GenerationService (`app/orchestration/generation_service.py`)

Центральный оркестратор. Координирует роутинг, retrieval и вызов AI.

**Метод `answer(request)`:**
1. Получение списка категорий через `php.categories()`
2. Роутинг: выбор категорий через `router.route(question, categories, forced_slugs)`
3. Retrieval: загрузка и ранжирование документов через `retriever.retrieve(question, selected_categories, top_k)`
4. Сборка system_prompt: базовый SYSTEM_PROMPT + `<knowledge_context>` с найденными источниками
5. Выбор истории: `chat_messages.messages` (при наличии) или legacy `messages`; добавление текущего `question`, если его ещё нет последним сообщением; ограничение до последних 20 сообщений.
6. Вызов AI Gateway через `php.chat(system_prompt, messages)`
7. Формирование ответа: `{answer, sources, routing, debug?}`

**Конфигурация:**
- `SYSTEM_PROMPT` — жёстко задан в коде. Инструктирует модель отвечать на русском, использовать только контекст, не выдумывать, не смешивать предположения с фактами.
- История диалога принимается в поле `chat_messages` как объект чата PHP (`id`, `fingerprint`, `created_at`, `messages`). Для обратной совместимости также поддерживается старое плоское поле `messages`. В AI Gateway передаются только `role` и `content`; последние 20 сообщений, включая текущий вопрос, сохраняются.

### KnowledgeRouter (`app/knowledge/router.py`)

Определяет, какие категории знаний релевантны вопросу пользователя.

**Алгоритм `route()`:**

```
Вход: query, categories[{slug, name, description}, ...], forced=[]

1. Если forced непустой → фильтр по доступным слагам, возврат {mode: "explicit"}
2. Нормализация query (lowercase, удаление небуквенных символов)
3. Для каждой категории:
   - Считаем совпадения ключевых слов из CATEGORY_KEYWORDS[slug]
   - Проверяем вхождение токенов из name/description (длиннее 3 символов)
4. Если все score == 0 → возврат {mode: "fallback_all"} (все активные категории)
5. Иначе → топ-система: выбираем slug'и с max_score и max_score-1
```

**Категории ключевых слов:**

| Слаг             | Примеры ключевых слов                                        |
|------------------|--------------------------------------------------------------|
| `00-reference`   | расчёт, стоимость, окупаемость, цена, выгода, срок, заявка   |
| `10-energy`      | энерг, электр, тариф, рынок, счётчик, мощность, потери, учёт |
| `20-products`    | продукт, платформа, сервис, АСКУЭ, солнечный, Energytool     |

### KnowledgeRetriever (`app/knowledge/retriever.py`)

Загружает, извлекает, чанкует и ранжирует контент из базы знаний.

**Алгоритм `retrieve()`:**

```
Вход: query, category_slugs[], top_k

1. Запрос кандидатов через php.retrieve(slugs, limit=30)
2. Для каждого кандидата:
   a. Если есть inline content — используем
   b. Если есть contentUrl — загружаем через fetch_bytes()
   c. Если есть documentUrl — загружаем исходный файл, извлекаем через extract_document() + extract_part()
   d. Опционально кэшируем извлечённый текст через php.cache_part()
3. Чанкинг: _split_chunks(content) — 3500 символов, 350 перекрытие
4. Токенизация: tokenize() — только буквы/цифры, длина > 1
5. BM25: BM25Okapi(corpus).get_scores(query_tokens)
6. Ранжирование: сортировка по score, выбор top_k
7. Сборка контекста: contexts[] до max_context_chars (24000)
```

**Параметры чанкинга:**

| Параметр                 | Значение                | ENV-переменная                    |
|---------------------------|-------------------------|-----------------------------------|
| `chunk_size_chars`        | 3500                    | `GENERATION_CHUNK_SIZE_CHARS`    |
| `chunk_overlap_chars`     | 350                     | `GENERATION_CHUNK_OVERLAP_CHARS` |
| `max_context_chars`       | 24000                   | `GENERATION_MAX_CONTEXT_CHARS`   |
| `candidate_limit`         | 30                      | `GENERATION_KNOWLEDGE_LIMIT`     |
| `top_k`                   | 6                       | `GENERATION_TOP_K`               |

### Extractors (`app/knowledge/extractors.py`)

Извлечение текста из документов разных форматов.

| Формат   | Функция            | Библиотека       |
|----------|---------------------|------------------|
| `.md` / `.txt` | `data.decode("utf-8-sig")` | Встроено |
| `.html` / `.htm` | `BeautifulSoup.get_text()` | `beautifulsoup4` / `lxml` |
| `.pdf` | `PdfReader.pages[i].extract_text()` | `pypdf` |
| `.docx` | `Document.paragraphs + tables` | `python-docx` |

**Локаторы для `extract_part()`:**

| Тип           | Описание                        | Пример locator                  |
|---------------|----------------------------------|---------------------------------|
| `whole_file`  | Весь документ                    | `{}`                            |
| `heading`     | По заголовку (Markdown или текст)| `{"heading": "Введение"}`       |
| `page_range`  | Диапазон страниц (PDF)           | `{"start": 3, "end": 7}`        |
| `line_range`  | Диапазон строк                   | `{"start": 10, "end": 30}`      |

### PHPClient (`app/infrastructure/php_client.py`)

Асинхронный HTTP-клиент для взаимодействия с PHP-бэкендом.

| Метод            | PHP-эндпоинт                  | Описание                                           |
|-------------------|-------------------------------|-----------------------------------------------------|
| `categories()`    | `GET /internal/v1/knowledge/categories` | Список активных категорий               |
| `retrieve()`      | `POST /internal/v1/knowledge/retrieve` | Получение документов по категориям       |
| `fetch_bytes()`   | `GET {contentUrl / documentUrl}`       | Загрузка бинарного контента              |
| `cache_part()`    | `POST /internal/v1/knowledge/parts/{id}/cache` | Кэширование извлечённого текста |
| `chat()`          | `POST /ai/chat`             | Вызов AI Gateway                        |

**Особенности:**
- Таймаут по умолчанию — `max(PHP_HTTP_TIMEOUT, PHP_AI_GATEWAY_TIMEOUT)` (180 сек)
- Заголовок авторизации: `Authorization: Bearer {token}`
- Все методы возвращают `dict` или `list[dict]`, ошибки — `PHPServiceError`

---

## Схема DI и инициализация

Инициализация происходит в `lifespan` FastAPI:

```python
php = PHPClient(PHP_INTERNAL_API_URL, INTERNAL_SERVICE_TOKEN, timeout=...)
generation = GenerationService(php, top_k, max_context_chars, ...)
```

| Компонент            | Зависимости                                | Тип            |
|-----------------------|--------------------------------------------|----------------|
| `PHPClient`           | `PHP_INTERNAL_API_URL`, `INTERNAL_SERVICE_TOKEN` | Инстанс на lifespan |
| `KnowledgeRouter`     | (нет)                                      | Создаётся в `GenerationService.__init__` |
| `KnowledgeRetriever`  | `PHPClient`, параметры чанкинга            | Создаётся в `GenerationService.__init__` |
| `GenerationService`   | `PHPClient`, `KnowledgeRouter`, `KnowledgeRetriever` | Инстанс на lifespan |

---

## Поток вызова (Sequence)

### 1. Вызов из фронтенда

```
Фронтенд → POST /api/generation/chat (PHP маршрут)
                                             │
                       GenerationController.actionChat()
                                             │
              POST /v1/generation/chat (Python FastAPI)
```

См. диаграмму [`.diagrams/generation-frontend-call.puml`](.diagrams/generation-frontend-call.puml).

### 2. Внутренний процесс генерации

```
FastAPI → GenerationService.answer()
           ├→ PHPClient.categories() → PHP: GET /internal/v1/knowledge/categories
           ├→ KnowledgeRouter.route()
           ├→ KnowledgeRetriever.retrieve()
           │    ├→ PHPClient.retrieve() → PHP: POST /internal/v1/knowledge/retrieve
           │    ├→ PHPClient.fetch_bytes() → PHP: GET .../file (для каждого документа)
           │    ├→ extract_document() / extract_part()
           │    ├→ _split_chunks() → BM25 → top_k
           │    └→ PHPClient.cache_part() (опционально)
           ├→ Сборка system_prompt с контекстом
           ├→ PHPClient.chat() → PHP: POST /ai/chat → AI Provider
           └→ Ответ {answer, sources, routing, debug?}
```

См. диаграммы:
- [`.diagrams/generation-process.puml`](.diagrams/generation-process.puml) — внутренний процесс
- [`.diagrams/generation-categories.puml`](.diagrams/generation-categories.puml) — взаимодействие с категориями
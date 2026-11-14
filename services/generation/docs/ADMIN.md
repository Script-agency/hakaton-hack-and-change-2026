# Администрирование сервиса генерации

## Конфигурация через ENV

Сервис читает настройки из переменных окружения. Все параметры имеют значения по умолчанию.

### Полный список ENV-переменных

| Переменная                      | Тип    | По умолчанию              | Описание                                                       |
|----------------------------------|--------|---------------------------|----------------------------------------------------------------|
| `PHP_INTERNAL_API_URL`          | string | `http://nginx-backend`    | Базовый URL внутреннего API PHP-бэкенда                        |
| `INTERNAL_SERVICE_TOKEN`        | string | `''`                      | Токен авторизации для внутренних запросов (Bearer)             |
| `PHP_HTTP_TIMEOUT`              | float  | `60`                      | Таймаут (сек) на обычные запросы к PHP (категории, retrieve)   |
| `PHP_AI_GATEWAY_TIMEOUT`        | float  | `180`                     | Таймаут (сек) на запрос к AI Gateway (генерация ответа)        |
| `GENERATION_TOP_K`              | int    | `6`                       | Количество чанков, попадающих в контекст (1–12)                |
| `GENERATION_MAX_CONTEXT_CHARS`  | int    | `24000`                   | Максимальное количество символов в контексте (≥4000)           |
| `GENERATION_CHUNK_SIZE_CHARS`   | int    | `3500`                    | Размер одного чанка при разбиении текста (≥800)                |
| `GENERATION_CHUNK_OVERLAP_CHARS`| int    | `350`                     | Перекрытие между чанками (0–50% от chunk_size)                |
| `GENERATION_KNOWLEDGE_LIMIT`    | int    | `30`                      | Максимальное количество кандидатов от PHP retrieve (1–100)     |

### Пример `.env`

```env
PHP_INTERNAL_API_URL=http://nginx-backend
INTERNAL_SERVICE_TOKEN=prod-token-xxxxxxxx
PHP_HTTP_TIMEOUT=60
PHP_AI_GATEWAY_TIMEOUT=180
GENERATION_TOP_K=6
GENERATION_MAX_CONTEXT_CHARS=24000
GENERATION_CHUNK_SIZE_CHARS=3500
GENERATION_CHUNK_OVERLAP_CHARS=350
GENERATION_KNOWLEDGE_LIMIT=30
```

### Docker-образ

Сборка через `Dockerfile` в корне сервиса. Рекомендуемый способ запуска — через `docker compose` проекта.

## Мониторинг и диагностика

### Health check

```bash
curl -X GET http://localhost:8000/health
# {"status": "ok", "service": "generation"}
```

### Логирование

Сервис использует `print()` в stdout для логирования (стандартный подход FastAPI для контейнеров).

**Логируются:**
- Входящие ошибки PHP-бэкенда: `PHP upstream error: {exc}`
- Внутренние ошибки: `generation error: {type}: {exc}`
- Ошибки загрузки отдельных документов: `failedParts` в debug-режиме

Для production рекомендуется настроить сбор логов через Docker (stdout → Docker logs → ELK/GrayLog/Sentry).

### Коды ответов для SRE-мониторинга

| HTTP-код | Действие                                       |
|----------|-------------------------------------------------|
| 200      | OK                                              |
| 502      | PHP-бэкенд недоступен или отвечает некорректно  |
| 504      | Таймаут — проверить PHP-бэкенд и AI Gateway     |
| 500      | Внутренняя ошибка — проверить stdout сервиса    |

## Типовые сценарии администрирования

### Проверка доступности PHP-бэкенда

```bash
# Проверить, что PHP-бэкенд отвечает
curl -X GET http://localhost:8080/internal/v1/knowledge/categories \
  -H "Authorization: Bearer $TOKEN"
```

### Проверка AI Gateway

```bash
curl -X POST http://localhost:8080/internal/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "systemPrompt": "Ответь кратко.",
    "messages": [{"role": "user", "content": "Привет"}]
  }'
```

### Очистка кэша знаний на PHP

Кэш на стороне PHP хранится в Redis. Для полной очистки:

```bash
redis-cli KEYS "knowledge:*" | xargs redis-cli DEL
```

## Безопасность

| Мера                                        | Статус                    |
|----------------------------------------------|---------------------------|
| Внутренняя авторизация через Bearer token    | ✅ Реализовано            |
| Запросы только к внутренним PHP-эндпоинтам   | ✅ Реализовано            |
| Валидация длины question (1–12000)           | ✅ Реализовано            |
| Валидация количества сообщений (≤40)         | ✅ Реализовано            |
| Валидация top_k (1–12)                       | ✅ Реализовано            |
| Rate-limit на уровне сервиса                 | ❌ Нет (полагаемся на шлюз)|
| Санитизация путей при fetch_bytes            | ❌ На стороне PHP-бэкенда |

## Тестирование

### Unit-тесты

```bash
pytest                          # Все тесты
pytest tests/test_router.py     # Только роутер
pytest tests/test_retriever.py  # Только ретривер
pytest tests/test_extractors.py # Только экстракторы
```

### Оценка качества (evaluation)

```bash
# Запустить evaluation на тестовых вопросах
python -m pytest tests/evaluation/ -v
```

Тестовые вопросы находятся в `tests/evaluation/demo_questions.json`.

## Импорт базы знаний

```bash
python scripts/import_knowledge_base.py /path/to/knowledge-base \
  --base-url http://localhost:8080 \
  --token "$ADMIN_TOKEN" \
  --publish
```

Структура импортируемой директории:
```
knowledge-base/
├── 00-reference/
│   ├── document1.pdf
│   └── document2.md
├── 10-energy/
│   ├── tariffs.pdf
│   └── metering.docx
└── 20-products/
    └── askue.html
```
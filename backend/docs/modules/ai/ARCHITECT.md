# Архитектура модуля AI

## Слои и их ответственность

Модуль следует DDD-подобной слоистой архитектуре. Каждый слой зависит только от нижележащего.

```
┌──────────────────────────────────────────────┐
│              Presentation                    │
│  AiController                                │
│  (HTTP → DTO, OpenAPI-аннотации)             │
├──────────────────────────────────────────────┤
│              Application                     │
│  AiService                                   │
│  (бизнес-логика, композиция операций)        │
│  AiRequestDto / AiResponseDto / AiSettingsDto│
│  (Data Transfer Objects)                     │
├──────────────────────────────────────────────┤
│              Domain                          │
│  AiInvalidResponseException                  │
│  AiRateLimitException                        │
│  AiTimeoutException                          │
│  AiTransportException                        │
│  (смысловые исключения домена)               │
├──────────────────────────────────────────────┤
│              Infrastructure                  │
│  AiClient (HTTP-транспорт к OpenAI API)      │
│  AiCookieStorage (cookie-хранение настроек)  │
└──────────────────────────────────────────────┘
```

---

## Presentation Layer

### AiController

Обрабатывает HTTP-запросы. Все экшены наследуют `BaseController` и возвращают JSON.

| Маршрут        | Метод | Экшен                | Описание                                |
|----------------|-------|----------------------|-----------------------------------------|
| `/ai/settings` | GET   | `actionSettings`     | Проверка настроек (без возврата apiKey) |
| `/ai/settings` | POST  | `actionSaveSettings` | Сохранение настроек в cookie            |
| `/ai/chat`     | POST  | `actionChat`         | Прокси-запрос к нейросети               |

Контроллер содержит полные `OpenApi\Attributes` аннотации, что позволяет генерировать OpenAPI-схему автоматически.

**Обработка ошибок в контроллере:**
```php
catch (AiRateLimitException)     → HTTP 429
catch (AiTimeoutException)       → HTTP 504
catch (AiInvalidResponseException) → HTTP 502
catch (AiTransportException)     → HTTP 502
catch (Throwable)                → HTTP 500 + логирование
```

---

## Application Layer

### AiService

Центральный сервис модуля. Синглтон (DI). Включает:

- `getSettings()` / `hasSettings()` / `getSettingsInfo()` — работа с настройками
- `saveSettings(baseUrl, apiKey, model)` — персистентное сохранение
- `chat(systemPrompt, messages, modelOverride?)` — основной бизнес-метод
- `chatWithSettings(settings, systemPrompt, messages)` — низкоуровневый метод для тестов

**Маршрут вызова `chat()`:**
1. Проверка и слияние настроек (cookie > ENV)
2. Если передан `modelOverride` — создаётся копия `AiSettingsDto` с заменой model
3. Вызов `chatWithSettings()`, который проверяет `isComplete()` и делегирует в `AiClient`

### DTO (Data Transfer Objects)

| Класс           | Поля                                                                | Назначение                                             |
|-----------------|---------------------------------------------------------------------|--------------------------------------------------------|
| `AiRequestDto`  | `systemPrompt: string`, `messages: array`, `modelOverride: ?string` | Инкапсулирует запрос к AI                              |
| `AiResponseDto` | `content: string`, `finishReason: string`, `usage: ?array`          | Нормализованный ответ AI (implements JsonSerializable) |
| `AiSettingsDto` | `baseUrl: string`, `apiKey: string`, `model: string`                | Настройки провайдера с методом `isComplete()`          |

---

## Domain Layer

### Исключения

Все исключения расширяют `RuntimeException` и несут HTTP status code:

| Исключение                   | HTTP Code | Когда возникает                                 |
|------------------------------|-----------|-------------------------------------------------|
| `AiTransportException`       | 502       | CURL-ошибка, HTTP 5xx, HTTP 400+ без rate-limit |
| `AiTimeoutException`         | 504       | Таймаут соединения или операции                 |
| `AiRateLimitException`       | 429       | HTTP 429 Too Many Requests                      |
| `AiInvalidResponseException` | 502       | Невалидный JSON или структура ответа от AI      |

Слой Domain **не содержит** Entity или ValueObject — логика достаточно проста, и вся работа с данными идёт через DTO и сервисы. При расширении модуля (добавлении хранения истории, провайдеров) здесь появятся соответствующие сущности.

---

## Infrastructure Layer

### AiClient

Отвечает за HTTP-транспорт. Особенности:

1. **Формирование URL** — `rtrim(baseUrl, '/') . '/chat/completions'`
2. **Кодирование JSON** — ручное, через `json_encode` с флагами `JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR` (Yii-клиент по умолчанию не включает нужные флаги)
3. **Retry-логика** — при `AiRateLimitException` выполняет до `maxRetries` повторных попыток с паузой `(attempt+1)` секунд (1s, 2s, ...)
4. **Парсинг ответа** — извлекает `choices[0].message.content`, `finish_reason`, `usage`. Ошибки структуры — `AiInvalidResponseException`

**Параметры HTTP-клиента (из ENV):**

| Параметр         | Переменная           | По умолчанию |
|------------------|----------------------|--------------|
| `timeout`        | `AI_HTTP_TIMEOUT`    | 300 сек      |
| `connectTimeout` | `AI_CONNECT_TIMEOUT` | 15 сек       |
| `maxRetries`     | `AI_MAX_RETRIES`     | 2            |

### AiCookieStorage

Хранит три cookie: `ai_base_url`, `ai_api_key`, `ai_model`.

- Cookie — httponly + secure + SameSite=Lax
- TTL по умолчанию — 2 592 000 сек (30 дней)
- `getSettings()` выполняет слияние: пустое поле в cookie → значение из `baseSettings` (ENV)
- `hasSettings()` — true, если хотя бы один источник (cookie или ENV) даёт полный набор полей

---

## DI-контейнер (config/di.php)

| Интерфейс / Класс | Тип регистрации  | Зависимости                            |
|-------------------|------------------|----------------------------------------|
| `AiCookieStorage` | singleton        | `AiSettingsDto` из params.php          |
| `AiClient`        | каждый раз новый | `yii\httpclient\Client`, ENV-параметры |
| `AiService`       | singleton        | `AiCookieStorage`, `AiClient`          |

`AiCookieStorage` — синглтон, так как работает с request/response текущего запроса (Yii-контекст).
`AiClient` — не синглтон, чтобы избежать разделения состояния между запросами (хотя состояние stateless).

---

## OpenAPI-спецификация

Контроллер содержит полные `#[OA_*]`-аннотации для каждого экшена. Это позволяет:

- Автоматически генерировать `openapi.json`
- Валидировать входящие/исходящие схемы
- Документировать ошибки (400, 429, 500, 502, 504)

**Схемы запросов:**
- `POST /ai/settings` — `{ baseUrl: string, apiKey: string, model: string }`
- `POST /ai/chat` — `{ systemPrompt?: string, modelOverride?: string, messages: array<{role, content}> }`
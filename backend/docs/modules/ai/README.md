# Модуль AI

## Обзор

Модуль `ai` предоставляет универсальный прокси-слой для взаимодействия с OpenAI-совместимыми API нейросетей. Он абстрагирует транспорт, настройки и обработку ошибок, позволяя единообразно отправлять chat-запросы к любой OpenAI-подобной модели через единый внутренний интерфейс.

**Архитектурный паттерн:** DDD-ориентированные слои (Presentation → Application → Domain → Infrastructure).

**Ключевые возможности:**
- Проксирование chat-запросов к произвольному OpenAI-совместимому API
- Хранение настроек (baseUrl, apiKey, model) в httponly/secure cookie с приоритетом над базовыми настройками из ENV
- Переопределение модели для конкретного запроса без изменения глобальных настроек
- Автоматический retry при rate-limit (HTTP 429) с экспоненциальной паузой
- Детальная типизация исключений (транспорт, таймаут, rate-limit, некорректный ответ)
- OpenAPI-документация в аннотациях контроллера

## Содержание документации

| Документ                           | Описание                                                         |
|------------------------------------|------------------------------------------------------------------|
| [README](README.md)                | Назначение, обзор, состав модуля (данный файл)                   |
| [ARCHITECT.md](ARCHITECT.md)       | Архитектура — слои, DTO, инфраструктура, DI-схема                |
| [CAPABILITIES.md](CAPABILITIES.md) | Функциональные возможности и примеры API-запросов                |
| [SCALING.md](SCALING.md)           | Масштабирование, производительность, горизонтальное расширение   |
| [ADMIN.md](ADMIN.md)               | Администрирование — ENV-переменные, мониторинг, типовые операции |
| [TECH_DEBT.md](TECH_DEBT.md)       | Известные баги, техдолг, ограничения и планы по доработке        |

## Структура модуля

```
backend/modules/ai/
├── Module.php                        # Базовый модуль Yii (beforeAction → JSON-формат)
├── config/
│   ├── params.php                    # Параметры по умолчанию (из ENV)
│   ├── routing.php                   # Маршруты (GET/POST /ai/settings, POST /ai/chat)
│   └── di.php                        # DI-контейнер (AiCookieStorage, AiClient, AiService)
├── application/
│   ├── dto/
│   │   ├── AiRequestDto.php          # DTO входящего запроса (systemPrompt, messages, modelOverride)
│   │   ├── AiResponseDto.php         # DTO ответа (content, finishReason, usage)
│   │   └── AiSettingsDto.php         # DTO настроек (baseUrl, apiKey, model) с isComplete()
│   └── service/
│       └── AiService.php             # Бизнес-логика: управление настройками, отправка chat-запроса
├── domain/
│   └── exception/
│       ├── AiInvalidResponseException.php  # Невалидный JSON/структура ответа
│       ├── AiRateLimitException.php        # Превышен лимит HTTP 429
│       ├── AiTimeoutException.php          # Таймаут соединения/запроса
│       └── AiTransportException.php        # Прочие транспортные ошибки
├── infrastructure/
│   ├── AiClient.php                  # HTTP-клиент для OpenAI API (ретрансляция + парсинг)
│   └── AiCookieStorage.php           # Хранение настроек в httponly cookie
└── presentation/
    └── controller/
        └── AiController.php          # Контроллеры: settings, save-settings, chat
```

## Быстрый старт

### 1. Конфигурация через ENV (базовый уровень)

```env
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini
AI_HTTP_TIMEOUT=300
AI_CONNECT_TIMEOUT=15
AI_MAX_RETRIES=2
```

### 2. Переопределение через cookie (опционально)

```http
POST /ai/settings
Content-Type: application/json

{
    "baseUrl": "https://api.openai.com/v1",
    "apiKey": "sk-...",
    "model": "gpt-4o"
}
```

### 3. Отправка chat-запроса

```http
POST /ai/chat
Content-Type: application/json

{
    "systemPrompt": "You are a helpful assistant.",
    "messages": [
        {"role": "user", "content": "Hello!"}
    ],
    "modelOverride": "gpt-4o"
}
```

## Зависимости

- **Yii Framework** — базовый фреймворк
- **yii\httpclient** — HTTP-клиент с CURL-транспортом
- **core** — базовые DTO (ErrorDto, SuccessDto), BaseController
- **OpenAPI** — аннотации для генерации схемы

---
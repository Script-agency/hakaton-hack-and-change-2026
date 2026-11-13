# Модуль Lead (Заявки / Лиды)

## Обзор

Модуль `lead` реализует управление заявками (лидами) — центральную сущность CRM-системы. Предоставляет публичный intake-эндпоинт для создания лидов и админ-панель для просмотра, фильтрации и изменения статусов.

**Архитектурный паттерн:** CQRS-стиль на основе DDD-слоёв — команды (Create, UpdateStatus), запросы (Get, List), хендлеры, репозиторий.

**Ключевые возможности:**
- Создание лида с валидацией (обязательные поля, формат телефона, уникальность по номеру)
- Полнотекстовый поиск и фильтрация (статус, компания, ФИО, телефон, дата)
- Машина состояний лида (new → in_progress → closed/cancelled)
- Защита от изменения финальных статусов (closed, cancelled)
- Хранение истории AI-диалога в JSON-поле
- Административный API с пагинацией

## Содержание документации

| Документ                           | Описание                                                      |
|------------------------------------|---------------------------------------------------------------|
| [README](README.md)                | Назначение, обзор, состав модуля (данный файл)                |
| [ARCHITECT.md](ARCHITECT.md)       | Архитектура — Entity, VO, Repository, CQRS-хендлеры, схема DI |
| [CAPABILITIES.md](CAPABILITIES.md) | Функциональные возможности и примеры API-запросов             |
| [SCALING.md](SCALING.md)           | Масштабирование, индексы, производительность запросов         |
| [ADMIN.md](ADMIN.md)               | Администрирование — миграции, мониторинг, типовые операции    |
| [TECH_DEBT.md](TECH_DEBT.md)       | Известные баги, техдолг, ограничения и планы по доработке     |

## Структура модуля

```
backend/modules/lead/
├── Module.php                        # Базовый модуль Yii (beforeAction → JSON-формат)
├── config/
│   ├── params.php                    # Параметры модуля (в данный момент пустой — для расширения)
│   ├── routing.php                   # Маршруты (публичные + admin)
│   └── di.php                        # DI-контейнер (репозиторий, хендлеры)
├── application/
│   ├── dto/
│   │   ├── LeadDto.php               # DTO для ответа (implements JsonSerializable)
│   │   └── LeadFiltersDto.php        # DTO фильтров списка (статус, дата, текст)
│   ├── command/
│   │   ├── CreateLeadCommand.php     # Команда создания лида
│   │   └── UpdateLeadStatusCommand.php # Команда смены статуса
│   ├── query/
│   │   ├── GetLeadQuery.php          # Запрос одного лида по ID
│   │   └── ListLeadQuery.php         # Запрос списка с фильтрами
│   └── handler/
│       ├── CreateLeadHandler.php     # Обработчик создания (с транзакцией)
│       ├── UpdateLeadStatusHandler.php # Обработчик смены статуса (с транзакцией)
│       ├── GetLeadHandler.php        # Обработчик получения одного лида
│       └── ListLeadHandler.php       # Обработчик списка
├── domain/
│   ├── entity/
│   │   └── Lead.php                  # Корневая сущность (Aggregate Root)
│   ├── enum/
│   │   └── LeadStatus.php            # Enum статусов (new, in_progress, closed, cancelled)
│   ├── exception/
│   │   └── InvalidLeadStatusException.php # Исключение невалидного статуса
│   ├── repository/
│   │   └── ILeadRepository.php       # Интерфейс репозитория
│   └── valueObject/
│       └── LeadId.php                # Value Object идентификатора лида
├── infrastructure/
│   ├── migrations/
│   │   └── m261113_000001_create_lead_table.php  # Миграция БД
│   ├── persistence/
│   │   └── LeadAR.php                # Yii ActiveRecord для таблицы lead
│   └── repository/
│       └── DbLeadRepository.php      # Реализация ILeadRepository через Query + AR
└── presentation/
    ├── controller/
    │   ├── LeadController.php        # Публичный intake (POST /leads)
    │   └── AdminLeadController.php   # Админка (GET/PATCH /admin/leads)
    └── request/
        ├── CreateLeadRequest.php     # Валидация формы создания
        └── UpdateLeadStatusRequest.php # Валидация формы смены статуса
```

## Быстрый старт

### 1. Миграция БД

```bash
php yii migrate --migrationPath=@modules/lead/infrastructure/migrations
```

### 2. Создание лида (публичный intake)

```http
POST /leads
Content-Type: application/json

{
    "company": "ООО Ромашка",
    "full_name": "Иван Петров",
    "phone": "+7 999 123-45-67",
    "summary": "Хочет купить сервер",
    "messages": [
        {"role": "user", "content": "Здравствуйте, интересует сервер..."},
        {"role": "assistant", "content": "Добрый день! Какую конфигурацию?"}
    ]
}
```

### 3. Просмотр лидов (админка)

```http
GET /admin/leads?status=new&limit=10&offset=0
```

## Зависимости

- **Yii Framework** — базовый фреймворк
- **core** — AbstractIntId, Phone, ITransactionManager, EntityNotFoundException, ValidationException, BaseController
- **MySQL / MariaDB** — через Yii ActiveRecord

---
# Архитектура модуля Lead

## Слои и их ответственность

Модуль реализует чисто DDD-ориентированную архитектуру с CQRS-стилем для разделения команд и запросов.

```
┌────────────────────────────────────────────────────┐
│                 Presentation                       │
│  LeadController / AdminLeadController              │
│  CreateLeadRequest / UpdateLeadStatusRequest       │
│  (HTTP-интерфейс, валидация форм Yii Model)        │
├────────────────────────────────────────────────────┤
│                  Application                       │
│  ┌────────────────┐  ┌──────────────────────────┐  │
│  │   Commands     │  │      Queries             │  │
│  │ CreateLeadCmd  │  │ GetLeadQuery             │  │
│  │ UpdateStatusCmd│  │ ListLeadQuery            │  │
│  └───────┬────────┘  └────────┬─────────────────┘  │
│  ┌───────▼────────┐  ┌────────▼─────────────────┐  │
│  │   Handlers     │  │      Handlers            │  │
│  │ CreateHandler  │  │ GetLeadHandler           │  │
│  │ UpdateHandler  │  │ ListLeadHandler          │  │
│  └────────────────┘  └──────────────────────────┘  │
│  DTO: LeadDto, LeadFiltersDto                      │
├────────────────────────────────────────────────────┤
│                   Domain                           │
│  ┌───────────────────────────────────────────┐     │
│  │  Entity: Lead (Aggregate Root)            │     │
│  │  VO: LeadId (extends AbstractIntId)       │     │
│  │  Enum: LeadStatus                         │     │
│  │  Repository: ILeadRepository (interface)  │     │
│  │  Exception: InvalidLeadStatusException    │     │
│  └───────────────────────────────────────────┘     │
├────────────────────────────────────────────────────┤
│                Infrastructure                      │
│  DbLeadRepository (ILeadRepository impl)           │
│  LeadAR (ActiveRecord)                             │
│  Migration m261113_000001                          │
└────────────────────────────────────────────────────┘
```

---

## Domain Layer

### Lead (Entity / Aggregate Root)

**Файл:** `domain/entity/Lead.php`

Центральная сущность модуля. Инкапсулирует все бизнес-правила и защитные инварианты.

**Поля:**

| Поле          | Тип                 | Ограничения                                 |
|---------------|---------------------|---------------------------------------------|
| `id`          | `LeadId`            | VO (int, extends AbstractIntId)             |
| `company`     | `string`            | Обязательное, max 255 символов, trim        |
| `fullName`    | `string`            | Обязательное, max 255 символов, trim        |
| `phone`       | `Phone`             | VO (из core)                                |
| `summary`     | `string`            | Обязательное, текст (без ограничения длины) |
| `messages`    | `?array`            | Опциональный JSON-массив истории AI-диалога |
| `status`      | `LeadStatus`        | Enum: new, in_progress, closed, cancelled   |
| `managerNote` | `?string`           | Опциональная заметка менеджера              |
| `createdAt`   | `DateTimeImmutable` | Автоустановка при создании                  |
| `updatedAt`   | `DateTimeImmutable` | Автообновление при каждой мутации           |

**Бизнес-правила (инварианты):**
1. `company`, `fullName`, `summary` не могут быть пустыми после trim
2. `company`, `fullName` не длиннее 255 символов
3. `changeStatus()` — запрещает переход из финального статуса (`closed`, `cancelled`) в любой другой
4. `isFinal()` — `true` для `CLOSED` и `CANCELLED`
5. Каждый мутатор (кроме `setId()`) вызывает `touch()`, обновляя `updatedAt`
6. `setId()` — internal, вызывается только репозиторием после `INSERT`

**Методы мутации:**
- `changeCompany()`, `changeFullName()`, `changePhone()`, `changeSummary()`, `changeMessages()`, `changeStatus()`, `changeManagerNote()`

### LeadId (Value Object)

**Файл:** `domain/valueObject/LeadId.php`

Типизированный идентификатор, наследуемый от `core\domain\valueObject\AbstractIntId`.
- `isNew()` — возвращает `true`, если id === 0 (ещё не сохранён)

### LeadStatus (Enum)

**Файл:** `domain/enum/LeadStatus.php`

```php
enum LeadStatus: string {
    case NEW         = "new";
    case IN_PROGRESS = "in_progress";
    case CLOSED      = "closed";
    case CANCELLED   = "cancelled";
}
```

### ILeadRepository (Interface)

**Файл:** `domain/repository/ILeadRepository.php`

Контракт репозитория, позволяющий подменять реализацию (в данный момент одна — `DbLeadRepository`):

| Метод                              | Возвращает | Исключение                |
|------------------------------------|------------|---------------------------|
| `findById(LeadId)`                 | `Lead`     | `EntityNotFoundException` |
| `findByPhone(Phone)`               | `Lead`     | `EntityNotFoundException` |
| `existsByPhone(Phone, ?excludeId)` | `bool`     | —                         |
| `findWithFilters(LeadFiltersDto)`  | `Lead[]`   | —                         |
| `countWithFilters(LeadFiltersDto)` | `int`      | —                         |
| `save(Lead)`                       | `void`     | `RuntimeException`        |

---

## Application Layer

### Commands

| Команда                   | Поля                                           | Назначение                               |
|---------------------------|------------------------------------------------|------------------------------------------|
| `CreateLeadCommand`       | `company, fullName, phone, summary, ?messages` | Перенос данных из HTTP-запроса в хендлер |
| `UpdateLeadStatusCommand` | `leadId, status, ?managerNote`                 | Перенос данных для смены статуса         |

### Queries

| Запрос          | Поля                      | Назначение                  |
|-----------------|---------------------------|-----------------------------|
| `GetLeadQuery`  | `leadId: int`             | Запрос одного лида          |
| `ListLeadQuery` | `filters: LeadFiltersDto` | Запрос списка с фильтрацией |

### Handlers

**CreateLeadHandler:**
1. Проверяет `existsByPhone()` — дубликаты запрещены
2. Создаёт `Lead` с id=0 (isNew = true) и статусом `NEW`
3. Сохраняет через репозиторий в транзакции (`ITransactionManager`)
4. Возвращает `LeadDto` (репозиторий устанавливает реальный id после save)

**UpdateLeadStatusHandler:**
1. Загружает `Lead` по ID
2. Вызывает `changeStatus()` — бизнес-правила внутри сущности
3. Если передан `managerNote` — вызывает `changeManagerNote()`
4. Сохраняет в транзакции

**GetLeadHandler:**
1. Загружает `Lead` по `LeadId(query->leadId)`
2. Возвращает `LeadDto`

**ListLeadHandler:**
1. Вызывает `findWithFilters()` репозитория
2. Маппит массив `Lead[]` в массив `LeadDto[]`

### DTO

**LeadDto** (implements `JsonSerializable`):
- Содержит все поля лида (id, company, full_name, phone, summary, messages, status, manager_note, created_at, updated_at)
- `fromEntity(Lead)` — создание из доменной сущности
- `fromAR(LeadAR)` — создание из ActiveRecord (мостик для существующего кода)

**LeadFiltersDto:**
- `?ids` — фильтр по массиву ID
- `?limit`, `?offset` — пагинация
- `?orderBy` — сортировка
- `?status`, `?company`, `?fullName`, `?phone` — текстовые фильтры (LIKE)
- `?createdFrom`, `?createdTo` — фильтр по дате создания

---

## Infrastructure Layer

### DbLeadRepository

Реализует `ILeadRepository` через `yii\db\Query` для чтения и `LeadAR` (ActiveRecord) для записи.

**Чтение:** через `yii\db\Query` — прямой SQL без загрузки AR, что снижает накладные расходы на пагинированных списках.

**Запись:** через `LeadAR::save()`:
- Если `LeadId.isNew()` — INSERT (new LeadAR)
- Иначе — `LeadAR::findOne()` → UPDATE

**Метод `buildFilterQuery()`:**
```php
SELECT * FROM lead
[WHERE id IN (:ids)]
  [AND status = :status]
  [AND company LIKE :company]
  [AND full_name LIKE :fullName]
  [AND phone LIKE :phone]
  [AND created_at >= :createdFrom]
  [AND created_at <= :createdTo]
ORDER BY :orderBy
LIMIT :limit OFFSET :offset
```

**Гидратация (`hydrate()`):**
- Декодирует `messages` из JSON
- Создаёт `Phone`, `LeadId`, `DateTimeImmutable`
- Вызывает конструктор `Lead` с полным набором полей

### LeadAR

Минимальный ActiveRecord для таблицы `lead` (свойства заданы через phpdoc).

### Миграция `m261113_000001_create_lead_table`

```sql
CREATE TABLE lead (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    company      VARCHAR(255) NOT NULL,
    full_name    VARCHAR(255) NOT NULL COMMENT 'ФИО контактного лица',
    phone        VARCHAR(20) NOT NULL,
    summary      TEXT NOT NULL COMMENT 'Резюме диалога с AI-ассистентом',
    messages     JSON DEFAULT NULL COMMENT 'История сообщений с AI-агентом',
    status       VARCHAR(20) NOT NULL DEFAULT 'new' COMMENT 'new, in_progress, closed, cancelled',
    manager_note TEXT DEFAULT NULL COMMENT 'Заметка менеджера',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE INDEX idx_lead_status ON lead(status);
```

---

## Presentation Layer

### Маршруты

| Маршрут                    | Метод | Контроллер                              | Описание                    |
|----------------------------|-------|-----------------------------------------|-----------------------------|
| `/leads`                   | POST  | LeadController::actionCreate            | Публичный intake            |
| `/admin/leads`             | GET   | AdminLeadController::actionIndex        | Список (фильтр + пагинация) |
| `/admin/leads/{id}`        | GET   | AdminLeadController::actionView         | Детали лида                 |
| `/admin/leads/{id}/status` | PATCH | AdminLeadController::actionUpdateStatus | Смена статуса               |

### Формы валидации

**CreateLeadRequest** — `yii\base\Model`:
- `company`, `full_name`, `phone`, `summary` — required
- `full_name` — приводится к нижнему регистру
- `phone` — regex `/^\+?[0-9\s\-\(\)]{7,20}$/`
- `messages` — опциональный массив с кастомным валидатором

**UpdateLeadStatusRequest** — `yii\base\Model`:
- `status` — required, in range ['new', 'in_progress', 'closed', 'cancelled']
- `manager_note` — опциональная строка

---

## DI-контейнер (config/di.php)

| Интерфейс / Класс                      | Тип регистрации |
|----------------------------------------|-----------------|
| `ILeadRepository` → `DbLeadRepository` | singleton       |
| `CreateLeadHandler`                    | singleton       |
| `UpdateLeadStatusHandler`              | singleton       |
| `GetLeadHandler`                       | singleton       |
| `ListLeadHandler`                      | singleton       |

Хендлеры регистрируются как singletons — они stateless (состояние хранится в репозитории и транзакционном менеджере).
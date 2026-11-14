# Архитектура модуля Knowledge

## Слои и их ответственность

Модуль следует DDD-подобной слоистой архитектуре. В отличие от модуля `lead`, здесь нет выделенного Domain-слоя с сущностями — вся бизнес-логика сосредоточена в сервисном слое, а данные представлены через ActiveRecord.

```
┌──────────────────────────────────────────────┐
│               Presentation                   │
│  AdminKnowledgeController                    │
│  InternalKnowledgeController                 │
│  (HTTP → сервис, OpenAPI-аннотации)          │
├──────────────────────────────────────────────┤
│               Application                    │
│  KnowledgeService                            │
│  (CRUD категорий, документов, частей,        │
│   retrieve, кэширование, транзакции)         │
├──────────────────────────────────────────────┤
│               Infrastructure                 │
│  ┌────────────────────────────────────────┐  │
│  │      Persistence (ActiveRecord)        │  │
│  │  KnowledgeCategoryAR                   │  │
│  │  KnowledgeDocumentAR                   │  │
│  │  KnowledgePartAR                       │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │      Storage (файловая система)        │  │
│  │  LocalFileStorage                      │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │      Cache (опциональный Redis)        │  │
│  │  KnowledgeCache                        │  │
│  └────────────────────────────────────────┘  │
│  Migrations: m261113_000002                  │
└──────────────────────────────────────────────┘
```

---

## Presentation Layer

### AdminKnowledgeController

**Файл:** `presentation/controller/AdminKnowledgeController.php`

Полный набор CRUD-эндпоинтов для администрирования базы знаний. Включает OpenAPI-аннотации (`#[OA_*]`) для каждого экшена.

#### Маршруты — Категории

| Маршрут                                  | Метод   | Экшен                       | Описание                         |
|------------------------------------------|---------|-----------------------------|----------------------------------|
| `/admin/knowledge/categories`            | GET     | `actionCategories`          | Список всех категорий            |
| `/admin/knowledge/categories`            | POST    | `actionCreateCategory`      | Создание категории (HTTP 201)    |
| `/admin/knowledge/categories/{id}`       | GET     | `actionCategory`            | Получить категорию               |
| `/admin/knowledge/categories/{id}`       | PATCH   | `actionUpdateCategory`      | Обновить категорию               |
| `/admin/knowledge/categories/{id}`       | DELETE  | `actionDeleteCategory`      | Удалить категорию (HTTP 204)     |

#### Маршруты — Документы

| Маршрут                                     | Метод | Экшен                     | Описание                              |
|----------------------------------------------|-------|---------------------------|---------------------------------------|
| `/admin/knowledge/documents`                 | GET   | `actionDocuments`         | Список документов (фильтр + пагинация) |
| `/admin/knowledge/documents`                 | POST  | `actionCreateDocument`    | Загрузка multipart-документа (201)     |
| `/admin/knowledge/documents/{id}`            | GET   | `actionDocument`          | Получить документ (с частями)          |
| `/admin/knowledge/documents/{id}`            | PATCH | `actionUpdateDocument`    | Обновить метаданные документа          |
| `/admin/knowledge/documents/{id}/file`       | PUT   | `actionReplaceDocument`   | Заменить файл документа                |
| `/admin/knowledge/documents/{id}/file`       | GET   | `actionDownloadDocument`  | Скачать оригинальный файл              |
| `/admin/knowledge/documents/{id}`            | DELETE| `actionDeleteDocument`    | Soft-delete документа (204)            |

#### Маршруты — Части

| Маршрут                                 | Метод | Экшен                  | Описание                           |
|-----------------------------------------|-------|------------------------|------------------------------------|
| `/admin/knowledge/documents/{id}/parts` | GET   | `actionParts`          | Список частей документа            |
| `/admin/knowledge/documents/{id}/parts` | POST  | `actionCreatePart`     | Создать часть (201)                |
| `/admin/knowledge/parts/{id}`           | GET   | `actionPart`           | Получить часть                     |
| `/admin/knowledge/parts/{id}`           | PATCH | `actionUpdatePart`     | Обновить часть                     |
| `/admin/knowledge/parts/{id}`           | DELETE| `actionDeletePart`     | Удалить часть (204)                |
| `/admin/knowledge/parts/{id}/content`   | GET   | `actionPartContent`    | Скачать текстовое содержимое части  |

### InternalKnowledgeController

**Файл:** `presentation/controller/InternalKnowledgeController.php`

Эндпоинты для внутренних сервисов платформы (например, AI-генерации).

| Маршрут                                            | Метод | Экшен                  | Описание                              |
|----------------------------------------------------|-------|------------------------|---------------------------------------|
| `/internal/v1/knowledge/categories`                | GET   | `actionCategories`     | Список только активных категорий      |
| `/internal/v1/knowledge/retrieve`                  | POST  | `actionRetrieve`       | Получение знаний по категориям        |
| `/internal/v1/knowledge/documents/{id}/file`       | GET   | `actionDocumentFile`   | Бинарное содержимое файла (inline)    |
| `/internal/v1/knowledge/parts/{id}/content`        | GET   | `actionPartContent`    | Текст части (или 204, если нет текста)|
| `/internal/v1/knowledge/parts/{id}/cache`          | POST  | `actionCachePart`      | Закэшировать извлечённое содержимое   |

**Обработка ошибок в контроллерах:**
```php
EntityNotFoundException → HTTP 404
ValidationException     → HTTP 400
FileStorageException    → HTTP 500
Throwable              → HTTP 500 + логирование
```

---

## Application Layer

### KnowledgeService

**Файл:** `application/service/KnowledgeService.php`

Центральный сервис модуля. Singleton (DI). Инкапсулирует всю бизнес-логику. Работает напрямую с ActiveRecord (без отдельного Domain-слоя).

#### Категории

| Метод               | Описание                                                     |
|---------------------|--------------------------------------------------------------|
| `listCategories()`  | Все категории, отсортированные по sort_order и name          |
| `createCategory()`  | Валидация + вставка, возвращает categoryData                 |
| `updateCategory()`  | Частичное обновление; защита от циклических parent_id        |
| `deleteCategory()`  | Только если нет дочерних категорий и привязанных частей      |
| `categoryData()`    | Форматирование в массив (private)                            |
| `findCategory()`    | Поиск по ID, throw EntityNotFoundException (private)         |

**Бизнес-правила категорий:**
1. `slug` — обязательный, regex `^[a-z0-9][a-z0-9._-]*$`, unique
2. `parent_id` — внешний ключ на ту же таблицу (`RESTRICT` при удалении)
3. Защита от цикла: `wouldCreateCategoryCycle()` проверяет всех предков
4. Удаление категории запрещено, если у неё есть дочерние категории или части

#### Документы

| Метод                  | Описание                                                          |
|------------------------|-------------------------------------------------------------------|
| `listDocuments()`      | Фильтрация по статусу, search (title/filename/description), category_id, пагинация |
| `getDocument()`        | Полный объект с частями                                           |
| `createDocument()`     | Multipart-загрузка: файл → LocalFileStorage, метаданные → БД, опционально часть с `whole_file` |
| `updateDocument()`     | Частичное обновление title, description, status                    |
| `replaceDocumentFile()`| Новый файл + инкремент revision, сброс кэша частей, удаление старого файла |
| `deleteDocument()`     | Soft-delete (deleted_at), каскадное удаление частей и файлов       |
| `documentPath()`       | Возвращает `{path, filename, mimeType}` для отправки файла        |
| `findDocument()`       | Поиск с фильтром `deleted_at IS NULL` (private)                   |

**Статусы документов:** `draft` → `published` → `archived` (проверка через `in`-правило AR).

#### Части (Parts)

| Метод               | Описание                                                         |
|---------------------|------------------------------------------------------------------|
| `listParts()`       | Все части документа, отсортированные по sort_order               |
| `createPart()`      | Создание части с валидацией локатора, опционально с content       |
| `updatePart()`      | Частичное обновление + инкремент revision, сброс кэша             |
| `getPart()`         | Получение одной части                                            |
| `deletePart()`      | Удаление части + очистка storage и кэша                          |
| `partData()`        | Форматирование части в массив (private)                          |
| `findPart()`        | Поиск по ID (private)                                            |

**Типы локаторов:**

| Тип           | Описание                | Поля locator                          |
|---------------|-------------------------|---------------------------------------|
| `whole_file`  | Весь файл целиком       | `{}`                                   |
| `heading`     | По заголовку            | `{"heading": "..."}`                  |
| `page_range`  | Диапазон страниц        | `{"start": 1, "end": 5}`             |
| `line_range`  | Диапазон строк          | `{"start": 10, "end": 20}`           |

#### Retrieve (внутренний API)

| Метод                | Описание                                                           |
|----------------------|--------------------------------------------------------------------|
| `retrieve()`         | Выборка опубликованных активных частей по слагам категорий + потомки |
| `cachePartContent()` | Сохранение извлечённого текста в Redis с проверкой ревизий          |

**Алгоритм `retrieve()`:**
1. Получение ID категорий по слагам и их активных потомков (`categoryIdsWithDescendants()`)
2. JOIN `knowledge_part` + `knowledge_document` + `knowledge_category`
3. Фильтр: `part.is_active = true`, `document.status = 'published'`, `document.deleted_at IS NULL`, `category.is_active = true`
4. Для каждой части — попытка чтения из Redis-кэша, при промахе — чтение из файла (если размер <= maxEntryBytes)
5. Формирование ответа: inline-содержимое для маленьких частей, `contentUrl`/`documentUrl` + локатор для больших

**Алгоритм `categoryIdsWithDescendants()`:**
1. Найти корневые категории по слагам
2. Рекурсивно собрать `id` всех активных потомков (BFS, защита от дубликатов)

#### Дополнительные приватные методы

| Метод                    | Описание                                                    |
|--------------------------|-------------------------------------------------------------|
| `validateLocator()`      | Проверка типа и значений локатора (включая required поля)   |
| `safeFilename()`         | Санитизация имени файла (basename, regex, до 255 символов)  |
| `nullableString()`       | `""` → `null`                                               |
| `nullableInt()`          | `""` / `null` → `null`                                       |
| `cacheKey()`             | Формирование ключа Redis: `knowledge:category:{id}:part:{id}:doc:{rev}:revision:{rev}` |
| `redisGet()` / `redisSet()` / `deletePartCache()` | Прокси-методы к KnowledgeCache с обработкой ошибок |

---

## Infrastructure Layer

### Persistence (ActiveRecord)

Все три AR-класса наследуют `yii\db\ActiveRecord` и используют стандартные Yii-правила валидации.

#### KnowledgeCategoryAR

**Таблица:** `knowledge_category`

| Поле          | Тип         | Ограничения                                            |
|---------------|-------------|--------------------------------------------------------|
| `id`          | bigint PK   | AUTO_INCREMENT                                         |
| `parent_id`   | bigint|null | FK на `knowledge_category(id)` — RESTRICT при удалении |
| `name`        | string(150) | required                                               |
| `slug`        | string(180) | required, unique, regex `^[a-z0-9][a-z0-9._-]*$`      |
| `description` | text|null   |                                                        |
| `sort_order`  | int         | default 0                                              |
| `is_active`   | bool        | default true                                           |
| `created_at`  | timestamp   | DEFAULT CURRENT_TIMESTAMP                              |
| `updated_at`  | timestamp   | DEFAULT CURRENT_TIMESTAMP                              |

#### KnowledgeDocumentAR

**Таблица:** `knowledge_document`

| Поле               | Тип          | Ограничения                                   |
|--------------------|--------------|-----------------------------------------------|
| `id`               | bigint PK    | AUTO_INCREMENT                                |
| `title`            | string(255)  | required                                      |
| `description`      | text|null    |                                               |
| `original_filename`| string(255)  | required                                      |
| `storage_key`      | string(512)  | required (путь в LocalFileStorage)            |
| `mime_type`        | string(150)  | required                                      |
| `extension`        | string(20)   | required                                      |
| `size_bytes`       | bigint       | required                                      |
| `checksum`         | string(64)   | required (SHA-256)                            |
| `revision`         | int          | default 1                                     |
| `status`           | string(20)   | default `'draft'`, range: draft/published/archived |
| `deleted_at`       | timestamp|null| soft-delete                                   |
| `created_at`       | timestamp    |                                               |
| `updated_at`       | timestamp    |                                               |

#### KnowledgePartAR

**Таблица:** `knowledge_part`

| Поле                 | Тип          | Ограничения                                   |
|----------------------|--------------|-----------------------------------------------|
| `id`                 | bigint PK    | AUTO_INCREMENT                                |
| `document_id`        | bigint       | FK → knowledge_document(id), CASCADE         |
| `category_id`        | bigint       | FK → knowledge_category(id), RESTRICT         |
| `title`              | string(255)  | required                                      |
| `description`        | text|null    |                                               |
| `locator_type`       | string(30)   | default `'whole_file'`, range: whole_file/heading/page_range/line_range |
| `locator`            | json         | default `'{}'`                                |
| `content_storage_key`| string(512)  | null — ключ к файлу в LocalFileStorage        |
| `revision`           | int          | default 1                                     |
| `sort_order`         | int          | default 0                                     |
| `is_active`          | bool         | default true                                  |
| `created_at`         | timestamp    |                                               |
| `updated_at`         | timestamp    |                                               |

### LocalFileStorage

**Файл:** `infrastructure/storage/LocalFileStorage.php`

Файловое хранилище для загруженных документов и текстовых частей.

| Метод                 | Описание                                                       |
|-----------------------|----------------------------------------------------------------|
| `saveUploadedFile()`  | Валидация расширения и размера, сохранение в `{root}/documents/{xx}/{key}.{ext}` |
| `saveText()`          | Проверка размера (maxPartSize), сохранение в `{root}/parts/{xx}/{key}.txt` |
| `path()`              | Резолвинг storage_key → полный путь + проверка существования   |
| `read()`              | Чтение содержимого файла                                       |
| `delete()`            | Удаление файла (safe — null/empty — no-op)                     |
| `newKey()`            | Генерация случайного ключа: `bin2hex(random_bytes(16))`        |
| `resolve()`           | Проверка безопасности: запрет path traversal, escape через `..` |

**Ограничения LocalFileStorage:**
- Разрешённые расширения: `md`, `txt`, `pdf`, `docx`, `html`, `htm`
- Максимальный размер файла (конфигурируемый, по умолчанию 20 МБ)
- Максимальный размер текстовой части (по умолчанию 1 МБ)
- Storage-ключи генерируются на сервере; имя исходного файла — только метаданные
- Защита от path traversal: `resolve()` проверяет все пути

### KnowledgeCache

**Файл:** `infrastructure/storage/KnowledgeCache.php`

Опциональное Redis-кэширование текста частей. При недоступности Redis работает в режиме gracefull degradation.

| Параметр                  | ENV-переменная                 | По умолчанию |
|---------------------------|--------------------------------|--------------|
| TTL кэша                  | `KNOWLEDGE_REDIS_TTL`          | 3600 сек     |
| Макс. размер inline-записи| `KNOWLEDGE_MAX_INLINE_PART_BYTES` | 262144 (256 КБ) |

**Особенности:**
- Ленивая инициализация Redis-клиента (при первом обращении)
- Отказоустойчивость: любая ошибка Redis логируется как warning, но не блокирует операцию
- Ключи содержат revision документа и revision части — изменение любого из них инвалидирует кэш

### Миграция `m261113_000002_create_knowledge_tables`

Создаёт три таблицы с индексами и внешними ключами:
- `knowledge_category` — уникальный индекс по `slug`, индекс по `parent_id`, FK на саму себя
- `knowledge_document` — индекс по `status`, индекс по `checksum`
- `knowledge_part` — составной индекс `(document_id, sort_order)`, составной индекс `(category_id, is_active)`, FK на `knowledge_document` (CASCADE), FK на `knowledge_category` (RESTRICT)

---

## DI-контейнер (config/di.php)

| Класс                | Тип регистрации | Параметры                                          |
|----------------------|-----------------|----------------------------------------------------|
| `LocalFileStorage`   | singleton       | ENV: `KNOWLEDGE_STORAGE_PATH`, `KNOWLEDGE_MAX_FILE_SIZE` |
| `KnowledgeCache`     | singleton       | ENV: `KNOWLEDGE_REDIS_TTL`, `KNOWLEDGE_MAX_INLINE_PART_BYTES` |
| `KnowledgeService`   | singleton       | Инжектит `LocalFileStorage` и `KnowledgeCache`     |

Все три класса зарегистрированы как singleton. `KnowledgeService` stateless (состояние хранится в БД, файловой системе и Redis).

---

## OpenAPI-спецификация

Оба контроллера содержат полные `#[OA_*]`-аннотации для каждого экшена. Это позволяет:
- Автоматически генерировать `openapi.json`
- Валидировать входящие/исходящие схемы
- Документировать ошибки (400, 404, 500)

**Основные схемы:**
- `KnowledgeCategory` — id, parentId, name, slug, description, sortOrder, isActive, createdAt, updatedAt
- `KnowledgeDocument` — id, title, description, originalFilename, mimeType, extension, sizeBytes, checksum, revision, status, downloadUrl, parts[], createdAt, updatedAt
- `KnowledgePart` — id, documentId, category, title, description, locatorType, locator, hasOwnContent, revision, sortOrder, isActive, contentUrl
- `RetrieveRequest` — categorySlugs: string[], limit: int
- `CachePartRequest` — content: string, documentRevision: int, partRevision: int

---
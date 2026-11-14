# Модуль Knowledge (База знаний)

## Обзор

Модуль `knowledge` реализует хранение, каталогизацию и выдачу знаний (документов и их частей) для AI-ассистентов и CRM-системы. Предоставляет административный API для управления категориями, документами и частями (parts), а также внутренний API для поиска и получения контента.

**Архитектурный паттерн:** DDD-ориентированные слои (Presentation → Application → Infrastructure) с сервис-ориентированной архитектурой. Вся бизнес-логика сконцентрирована в едином `KnowledgeService`.

**Ключевые возможности:**
- Иерархические категории знаний (slug, sort_order, поддержка вложенности с защитой от циклов)
- Загрузка, хранение и замена файлов документов (md, txt, pdf, docx, html/htm)
- Разбивка документа на части (parts) с локаторами: whole_file, heading, page_range, line_range
- Статусная модель документов: `draft` → `published` → `archived`
- Soft-delete документов с каскадным удалением файлов и частей
- Поиск и получение опубликованных знаний по категориям (retrieve)
- Кэширование содержимого частей в Redis (опционально, с инвалидацией по ревизии)
- OpenAPI-документация в аннотациях контроллеров

## Содержание документации

| Документ                           | Описание                                                      |
|------------------------------------|---------------------------------------------------------------|
| [README](README.md)                | Назначение, обзор, состав модуля (данный файл)                |
| [ARCHITECT.md](ARCHITECT.md)       | Архитектура — слои, AR, хранилища, схема DI, маршрутизация   |
| [CAPABILITIES.md](CAPABILITIES.md) | Функциональные возможности и примеры API-запросов              |
| [SCALING.md](SCALING.md)           | Масштабирование, индексы, производительность                   |
| [ADMIN.md](ADMIN.md)               | Администрирование — ENV, миграции, мониторинг, команды        |
| [TECH_DEBT.md](TECH_DEBT.md)       | Известные баги, техдолг, ограничения и планы по доработке      |

## Структура модуля

```
backend/modules/knowledge/
├── Module.php                        # Базовый модуль Yii (beforeAction → JSON-формат)
├── config/
│   ├── params.php                    # Параметры модуля (storagePath, maxFileSize из ENV)
│   ├── routing.php                   # Маршруты (admin + internal)
│   └── di.php                        # DI-контейнер (LocalFileStorage, KnowledgeCache, KnowledgeService)
├── application/
│   └── service/
│       └── KnowledgeService.php      # Единый сервис: CRUD категорий, документов, частей, retrieve
├── infrastructure/
│   ├── migrations/
│   │   └── m261113_000002_create_knowledge_tables.php  # Миграция БД (3 таблицы + индексы + FK)
│   ├── persistence/
│   │   ├── KnowledgeCategoryAR.php    # ActiveRecord категории
│   │   ├── KnowledgeDocumentAR.php    # ActiveRecord документа
│   │   └── KnowledgePartAR.php       # ActiveRecord части документа
│   └── storage/
│       ├── LocalFileStorage.php       # Файловое хранилище (загрузка/чтение/удаление файлов)
│       └── KnowledgeCache.php         # Опциональное Redis-кэширование текста частей
└── presentation/
    └── controller/
        ├── AdminKnowledgeController.php    # Админский API (CRUD категорий, документов, частей)
        └── InternalKnowledgeController.php # Внутренний API (список категорий, retrieve, контент)
```

## Быстрый старт

### 1. Конфигурация через ENV

```env
KNOWLEDGE_STORAGE_PATH=/var/storage/knowledge
KNOWLEDGE_MAX_FILE_SIZE=20971520
KNOWLEDGE_MAX_PART_SIZE=1048576
KNOWLEDGE_REDIS_TTL=3600
KNOWLEDGE_MAX_INLINE_PART_BYTES=262144
REDIS_HOST=redis
REDIS_PORT=6379
```

### 2. Миграция БД

```bash
php yii migrate --migrationPath=@modules/knowledge/infrastructure/migrations
# или через Docker:
docker compose exec php-fpm php yii migrate --interactive=0
```

### 3. Создание категории (админка)

```http
POST /admin/knowledge/categories
Content-Type: application/json

{
    "name": "Продукты",
    "slug": "products",
    "description": "Информация о продуктах компании",
    "sort_order": 10,
    "is_active": true
}
```

### 4. Загрузка документа (multipart)

```http
POST /admin/knowledge/documents
Authorization: Bearer <admin-token>
Content-Type: multipart/form-data

file: @document.pdf
title: "Инструкция по настройке"
categoryId: 1
status: published
```

### 5. Получение знаний (внутренний API)

```http
POST /internal/v1/knowledge/retrieve
Content-Type: application/json

{
    "categorySlugs": ["products"],
    "limit": 50
}
```

## Зависимости

- **Yii Framework** — базовый фреймворк
- **MySQL / MariaDB** — через Yii ActiveRecord
- **Redis** (опционально) — кэширование контента частей
- **core** — EntityNotFoundException, FileStorageException, ValidationException, BaseController
- **finfo** (опционально) — определение MIME-типа загружаемых файлов
- **OpenAPI** — аннотации для генерации схемы

---
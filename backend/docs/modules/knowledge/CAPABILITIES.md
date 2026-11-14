# Возможности модуля Knowledge

## Функциональные возможности

### 1. Иерархические категории знаний

Поддержка дерева категорий с произвольной вложенностью:

- Категория имеет уникальный `slug` (используется в retrieve)
- Категория может быть привязана к родительской (`parent_id`)
- Защита от циклических связей (`wouldCreateCategoryCycle()`)
- Сортировка через `sort_order`
- Флаг `is_active` — неактивные категории скрыты от retrieve
- Каскадный запрет удаления: категорию нельзя удалить, если есть дочерние категории или привязанные части

### 2. Загрузка и хранение файлов документов

Документы загружаются через `multipart/form-data`:

**Поддерживаемые форматы:** md, txt, pdf, docx, html, htm

**Ограничения:**
- Максимальный размер: 20 МБ (конфигурируется через `KNOWLEDGE_MAX_FILE_SIZE`)
- Имена файлов санитизируются (basename, regex-фильтр, до 255 символов)
- Файлы сохраняются вне `web/` — защита от прямого доступа по URL
- Storage-ключи генерируются случайно, оригинальное имя — только метаданные
- Автоматическое определение MIME-типа через finfo (если доступно)

**Метаданные документа:**
- `title` — название (можно задать вручную, иначе из имени файла)
- `description` — описание
- `original_filename`, `mime_type`, `extension`, `size_bytes`
- `checksum` — SHA-256 для дедупликации
- `revision` — инкрементируется при замене файла
- `status` — draft / published / archived

### 3. Статусная модель документа

```
                  ┌──────────┐
                  │  draft   │
                  └────┬─────┘
                       │
                  ┌────▼──────┐
                  │ published │
                  └────┬──────┘
                       │
                  ┌────▼──────┐
                  │ archived  │
                  └───────────┘
```

- Только документы со статусом `published` возвращаются через `retrieve`
- Soft-delete (`deleted_at`) не зависит от статуса

### 4. Части документов (Knowledge Parts)

Один документ может быть разбит на несколько частей, каждая — со своей категорией и локатором.

**Типы локаторов:**

| Тип           | Локатор                                   | Пример использования                 |
|---------------|-------------------------------------------|--------------------------------------|
| `whole_file`  | `{}`                                      | Весь документ как одна часть         |
| `heading`     | `{"heading": "Варианты размещения"}`       | Выборка по заголовку в Markdown/HTML |
| `page_range`  | `{"start": 1, "end": 5}`                  | Страницы PDF                         |
| `line_range`  | `{"start": 10, "end": 20}`                | Строки из txt/html                   |

**Особенности частей:**
- Часть может иметь собственное текстовое содержимое (`content`), которое сохраняется отдельным файлом
- Если контент не задан — часть ссылается на исходный файл документа через локатор
- Каждая часть имеет собственную ревизию и `is_active`
- Части сортируются через `sort_order`
- При удалении документа все его части также удаляются (CASCADE)

### 5. Soft-delete документов

При удалении документа:
1. Устанавливается `deleted_at` (данные остаются в БД)
2. Все части помечаются как удалённые (или удаляются каскадно)
3. Файлы документа и частей физически удаляются из LocalFileStorage
4. Кэш Redis инвалидируется

### 6. Retrieval знаний (внутренний API)

`POST /internal/v1/knowledge/retrieve` — основной механизм получения знаний для AI-ассистента:

**Алгоритм:**
1. Принимает массив `categorySlugs`
2. Находит ID категорий и всех их активных потомков (рекурсивно, BFS)
3. Выбирает все активные части с документами в статусе `published`
4. Для каждой части пытается прочитать содержимое из Redis-кэша
5. При промахе — читает из файла (для частей с собственным контентом, если размер <= 256 КБ)
6. Формирует ответ: маленькие части — inline, большие — через contentUrl/documentUrl + локатор

**Ответ retrieve:**
```json
{
  "items": [
    {
      "id": 1,
      "documentId": 42,
      "categoryId": 3,
      "category": {"name": "Продукты", "slug": "products"},
      "title": "Инструкция по настройке",
      "description": "...",
      "locatorType": "heading",
      "locator": {"heading": "Быстрый старт"},
      "partRevision": 1,
      "documentRevision": 2,
      "filename": "setup_guide.pdf",
      "mimeType": "application/pdf",
      "extension": "pdf",
      "documentTitle": "Руководство пользователя",
      "contentUrl": "/internal/v1/knowledge/parts/1/content",
      "documentUrl": "/internal/v1/knowledge/documents/42/file",
      "content": "…" // inline, если небольшое
    }
  ]
}
```

### 7. Кэширование через Redis

- Текстовое содержимое частей (извлечённое Python или загруженное вручную) кэшируется в Redis
- Ключ кэша: `knowledge:category:{id}:part:{id}:doc:{rev}:revision:{rev}`
- TTL: 3600 секунд (конфигурируемый)
- Максимальный размер inline-записи: 256 КБ (большие части отдаются по ссылке)
- Graceful degradation: при недоступности Redis операции не блокируются
- Инвалидация кэша при обновлении/удалении частей

### 8. Замена файла документа

`PUT /admin/knowledge/documents/{id}/file` — замена оригинального файла:
1. Сохраняет новый файл в LocalFileStorage
2. Инкрементирует revision документа (ключи кэша становятся невалидными)
3. Инвалидирует кэш всех частей документа
4. Удаляет старый файл из хранилища
5. Атомарность: при ошибке новый файл удаляется, старый остаётся

### 9. Хранение контента частей

При создании/обновлении части можно передать поле `content`:
- Контент сохраняется как отдельный `.txt` файл в `{root}/parts/{xx}/{key}.txt`
- При retrieve маленькие части (< 256 КБ) передаются inline
- Большие части возвращают `contentUrl` для ленивой загрузки
- Если контент не задан — часть ссылается на исходный файл через локатор

---

## API-эндпоинты

### Административные (Admin API)

#### Категории

**Список категорий:**
```http
GET /admin/knowledge/categories
```
```json
{
  "items": [
    {
      "id": 1,
      "parentId": null,
      "name": "Продукты",
      "slug": "products",
      "description": "Описание продуктов",
      "sortOrder": 10,
      "isActive": true,
      "createdAt": "2026-11-13 12:00:00",
      "updatedAt": "2026-11-13 12:00:00"
    }
  ]
}
```

**Создание категории:**
```http
POST /admin/knowledge/categories
Content-Type: application/json

{
    "name": "Энергетика",
    "slug": "energy",
    "description": "Энергетические продукты",
    "parent_id": 1,
    "sort_order": 20,
    "is_active": true
}
```

**Обновление категории (PATCH):**
```http
PATCH /admin/knowledge/categories/{id}
Content-Type: application/json

{"name": "Новое название", "sort_order": 15}
```

**Удаление категории:**
```http
DELETE /admin/knowledge/categories/{id}
```
- HTTP 204 при успехе
- HTTP 400, если есть дочерние категории или части

#### Документы

**Список документов:**
```http
GET /admin/knowledge/documents?status=published&search=инструкция&categoryId=3&limit=20&offset=0
```
```json
{
  "items": [...],
  "_meta": {"total": 42}
}
```

**Загрузка документа:**
```http
POST /admin/knowledge/documents
Content-Type: multipart/form-data

file: @document.pdf
title: "Руководство"
categoryId: 1
description: "Полное руководство пользователя"
status: published
```
- HTTP 201 при создании
- Обязательно поле `file`, остальное — опционально

**Получение документа:**
```http
GET /admin/knowledge/documents/{id}
```
Возвращает документ со всеми частями внутри поля `parts`.

**Обновление метаданных:**
```http
PATCH /admin/knowledge/documents/{id}
Content-Type: application/json

{"title": "Новое название", "status": "archived"}
```

**Замена файла:**
```http
PUT /admin/knowledge/documents/{id}/file
Content-Type: multipart/form-data

file: @new_version.pdf
```

**Скачивание файла:**
```http
GET /admin/knowledge/documents/{id}/file
```
Бинарное содержимое файла (Content-Disposition: attachment).

**Удаление:**
```http
DELETE /admin/knowledge/documents/{id}
```
- HTTP 204 при успехе (soft-delete)

#### Части

**Список частей документа:**
```http
GET /admin/knowledge/documents/{id}/parts
```

**Создание части:**
```http
POST /admin/knowledge/documents/{documentId}/parts
Content-Type: application/json

{
    "category_id": 3,
    "title": "Размещение панелей",
    "locator_type": "heading",
    "locator": {"heading": "Варианты размещения"},
    "content": "Текст части (опционально)",
    "sort_order": 0
}
```
- `category_id` — обязателен
- `title` — обязателен (по умолчанию — title документа)
- `locator_type` — по умолчанию `whole_file`
- `content` — опционально; если передан, сохраняется в отдельный файл

**Обновление части:**
```http
PATCH /admin/knowledge/parts/{id}
Content-Type: application/json

{
    "title": "Новый заголовок",
    "content": "Новый текст части",
    "locator_type": "page_range",
    "locator": {"start": 5, "end": 10},
    "is_active": false
}
```

**Получение содержимого части:**
```http
GET /admin/knowledge/parts/{id}/content
```
- HTTP 200 + text/plain, если есть собственный контент
- HTTP 404, если часть не имеет отдельного текста

### Внутренние (Internal API)

**Активные категории:**
```http
GET /internal/v1/knowledge/categories
```
Только категории с `is_active = true`.

**Retrieve знаний:**
```http
POST /internal/v1/knowledge/retrieve
Content-Type: application/json

{
    "categorySlugs": ["energy", "products"],
    "limit": 50
}
```
Возвращает массив частей (описание выше).

**Файл документа:**
```http
GET /internal/v1/knowledge/documents/{id}/file
```
Бинарное содержимое (inline для просмотра).

**Содержимое части:**
```http
GET /internal/v1/knowledge/parts/{id}/content
```
- HTTP 200 + text/plain с содержимым
- HTTP 204, если контент не сохранён (извлекается из исходного файла)

**Кэширование части:**
```http
POST /internal/v1/knowledge/parts/{id}/cache
Content-Type: application/json

{
    "content": "Извлечённый текст...",
    "documentRevision": 2,
    "partRevision": 1
}
```
- HTTP 400 при несовпадении ревизий (stale content)
- Используется Python-импортёром после извлечения текста

---

## Варианты использования

1. **AI-ассистент с RAG** — retrieve возвращает релевантные документы по категориям → AI формирует ответ на их основе
2. **База знаний для менеджеров** — каталогизация инструкций, прайс-листов, регламентов по категориям
3. **Загрузка документации** — массовый импорт Markdown-файлов через import_knowledge_base.py
4. **Версионирование** — замена файла с автоматическим обновлением ревизии и инвалидацией кэша
5. **Мультикатегоризация** — один документ может иметь части в разных категориях
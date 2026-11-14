# Администрирование модуля Knowledge

## Конфигурация через ENV

### Полный список ENV-переменных

| Переменная                         | Тип    | По умолчанию              | Описание                                                      |
|------------------------------------|--------|---------------------------|---------------------------------------------------------------|
| `KNOWLEDGE_STORAGE_PATH`           | string | `{app}/storage/knowledge` | Путь к корню файлового хранилища документов и частей          |
| `KNOWLEDGE_MAX_FILE_SIZE`          | int    | `20971520` (20 МБ)        | Максимальный размер загружаемого файла документа (байт)       |
| `KNOWLEDGE_MAX_PART_SIZE`          | int    | `1048576` (1 МБ)          | Максимальный размер текстовой части (байт)                    |
| `KNOWLEDGE_REDIS_TTL`              | int    | `3600` (1 час)            | TTL кэша Redis для содержимого частей (секунд)                |
| `KNOWLEDGE_MAX_INLINE_PART_BYTES`  | int    | `262144` (256 КБ)         | Максимальный размер части, передаваемой inline (не через URL) |
| `REDIS_HOST`                       | string | `redis`                   | Хост Redis                                                    |
| `REDIS_PORT`                       | int    | `6379`                    | Порт Redis                                                    |
| `REDIS_PASSWORD`                   | string | `''`                      | Пароль Redis (опционально)                                    |

### Пример `.env`

```env
KNOWLEDGE_STORAGE_PATH=/var/data/storage/knowledge
KNOWLEDGE_MAX_FILE_SIZE=52428800
KNOWLEDGE_MAX_PART_SIZE=2097152
KNOWLEDGE_REDIS_TTL=7200
KNOWLEDGE_MAX_INLINE_PART_BYTES=524288
REDIS_HOST=redis-prod-01
REDIS_PORT=6379
REDIS_PASSWORD=secret123
```

### params.php

```php
return [
    'storagePath' => $_ENV['KNOWLEDGE_STORAGE_PATH'] ?? dirname(__DIR__, 3) . '/storage/knowledge',
    'maxFileSize' => (int)($_ENV['KNOWLEDGE_MAX_FILE_SIZE'] ?? 20971520),
];
```

---

## Функции модуля и расписание их выполнения

Ниже приведено полное расписание поддерживаемых функций модуля `knowledge` — их назначение, триггеры выполнения, периодичность и способ запуска.

| №  | Функция                                  | Тип                      | Триггер / Периодичность                             | Способ запуска / Примечания                                                                                            |
|----|------------------------------------------|--------------------------|-----------------------------------------------------|------------------------------------------------------------------------------------------------------------------------|
| 1  | **Миграция схемы БД**                    | One-shot                 | При первом развёртывании                            | `php yii migrate --migrationPath=@modules/knowledge/infrastructure/migrations` (см. раздел Миграции БД)                |
| 2  | **Создание / обновление категорий**      | Оперативная              | По требованию (админ)                               | HTTP-запросы `POST/PATCH /admin/knowledge/categories`                                                                  |
| 3  | **Загрузка документа**                   | Оперативная              | По требованию (админ)                               | HTTP `POST /admin/knowledge/documents` (multipart)                                                                     |
| 4  | **Замена файла документа**               | Оперативная              | По требованию (админ)                               | HTTP `PUT /admin/knowledge/documents/{id}/file` (multipart); инкрементирует revision                                   |
| 5  | **Удаление документа**                   | Оперативная              | По требованию (админ)                               | HTTP `DELETE /admin/knowledge/documents/{id}` (soft-delete)                                                            |
| 6  | **Создание / обновление частей**         | Оперативная              | По требованию (админ)                               | HTTP-запросы `POST/PATCH /admin/knowledge/documents/{id}/parts`                                                        |
| 7  | **Импорт начального корпуса**            | One-shot / Периодическая | При развёртывании; далее по мере обновления корпуса | `python services/generation/scripts/import_knowledge_base.py` (см. раздел Импорт)                                      |
| 8  | **Retrieve знаний**                      | Оперативная              | При каждом вызове AI-ассистента                     | HTTP `POST /internal/v1/knowledge/retrieve` — вызывается внутренними сервисами                                         |
| 9  | **Кэширование контента части**           | Оперативная              | После извлечения текста                             | HTTP `POST /internal/v1/knowledge/parts/{id}/cache` — вызывается Python-импортёром после парсинга документа            |
| 10 | **Автоматическая инвалидация кэша**      | Автоматическая           | При обновлении / удалении частей                    | Встроено в `KnowledgeService`: сброс кэша при PKG update/delete                                                        |
| 11 | **Архивация старых документов (manual)** | Периодическая            | По мере необходимости                               | SQL-запрос для перевода документов в статус `archived` (см. раздел Типовые операции)                                   |

---

## Миграции БД

### Применение миграции

```bash
# Применить все миграции модуля
php yii migrate --migrationPath=@modules/knowledge/infrastructure/migrations

# Через Docker
docker compose exec php-fpm php yii migrate --interactive=0
```

### Откат миграции

```bash
php yii migrate/down 1 --migrationPath=@modules/knowledge/infrastructure/migrations
```

### Миграция m261113_000002

Создаёт три таблицы:

**knowledge_category:**
```sql
CREATE TABLE knowledge_category (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    parent_id   BIGINT DEFAULT NULL,
    name        VARCHAR(150) NOT NULL,
    slug        VARCHAR(180) NOT NULL,
    description TEXT DEFAULT NULL,
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX uq_knowledge_category_slug ON knowledge_category(slug);
CREATE INDEX idx_knowledge_category_parent ON knowledge_category(parent_id);
-- FK: parent_id -> knowledge_category(id) RESTRICT ON DELETE, CASCADE ON UPDATE
```

**knowledge_document:**
```sql
CREATE TABLE knowledge_document (
    id                BIGINT PRIMARY KEY AUTO_INCREMENT,
    title             VARCHAR(255) NOT NULL,
    description       TEXT DEFAULT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_key       VARCHAR(512) NOT NULL,
    mime_type         VARCHAR(150) NOT NULL,
    extension         VARCHAR(20) NOT NULL,
    size_bytes        BIGINT NOT NULL,
    checksum          VARCHAR(64) NOT NULL,
    revision          INT NOT NULL DEFAULT 1,
    status            VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at        TIMESTAMP DEFAULT NULL
);
CREATE INDEX idx_knowledge_document_status ON knowledge_document(status);
CREATE INDEX idx_knowledge_document_checksum ON knowledge_document(checksum);
```

**knowledge_part:**
```sql
CREATE TABLE knowledge_part (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    document_id         BIGINT NOT NULL,
    category_id         BIGINT NOT NULL,
    title               VARCHAR(255) NOT NULL,
    description         TEXT DEFAULT NULL,
    locator_type        VARCHAR(30) NOT NULL DEFAULT 'whole_file',
    locator             JSON NOT NULL DEFAULT '{}',
    content_storage_key VARCHAR(512) DEFAULT NULL,
    revision            INT NOT NULL DEFAULT 1,
    sort_order          INT NOT NULL DEFAULT 0,
    is_active           TINYINT(1) NOT NULL DEFAULT 1,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_knowledge_part_document ON knowledge_part(document_id, sort_order);
CREATE INDEX idx_knowledge_part_category ON knowledge_part(category_id, is_active);
-- FK: document_id -> knowledge_document(id) CASCADE ON DELETE, CASCADE ON UPDATE
-- FK: category_id -> knowledge_category(id) RESTRICT ON DELETE, CASCADE ON UPDATE
```

---

## Файловое хранилище

Путь по умолчанию: `{app_root}/storage/knowledge/`

```
storage/knowledge/
├── documents/
│   ├── a1/
│   │   └── a1b2c3d4e5f6...{ext}
│   └── ff/
│       └── ff0011223344...{ext}
└── parts/
    ├── 00/
    │   └── 001122334455...txt
    └── ab/
        └── abcdef123456...txt
```

Файлы организованы по префиксу (первые 2 символа hex-ключа) для избежания слишком большого количества файлов в одной директории.

---

## Мониторинг

### Метрики для SRE-мониторинга

| Метрика                            | Источник                                                           | Комментарий                                      |
|------------------------------------|--------------------------------------------------------------------|--------------------------------------------------|
| Общее количество документов        | `SELECT COUNT(*) FROM knowledge_document WHERE deleted_at IS NULL` | Объём базы знаний                                |
| Количество документов по статусам  | `SELECT status, COUNT(*) ... GROUP BY status`                      | draft vs published vs archived                   |
| Размер файлового хранилища         | `du -sh {KNOWLEDGE_STORAGE_PATH}`                                  | Рост дискового пространства                      |
| Количество Redis-ключей кэша       | `redis-cli --scan --pattern 'knowledge:*' \| wc -l`                | Эффективность кэширования                        |
| Попадание в кэш Redis (hit ratio)  | `redis-cli info stats` → `keyspace_hits / keyspace_misses`         | Качество кэширования                             |
| Ошибки сохранения файлов           | Логи `FileStorageException` в категории `knowledge`                | Проблемы с диском или правами                    |
| Ошибки кэширования Redis           | Логи `Yii::warning(...)` с `'knowledge'`                           | Redis недоступен или перегружен                  |
| Ошибки валидации (HTTP 400)        | HTTP-ответы 400 на `/admin/knowledge/*`                            | Качество данных от клиентов                      |

### Логирование

Модуль логирует через Yii:
- `Yii::warning(...)` — ошибки Redis (кэш), уровень `'knowledge'`
- `ValidationException` — ошибки валидации (расширения, размер, локатор)
- `EntityNotFoundException` — запрос несуществующей сущности (404)
- `FileStorageException` — ошибки файлового хранилища (500)
- `Throwable` — все необработанные исключения (категория `'knowledge'`)

### Проверка состояния Redis

```bash
# Проверить, что Redis-кэш работает
redis-cli --scan --pattern 'knowledge:*' | head -10

# Просмотреть TTL конкретного ключа
redis-cli ttl "knowledge:category:1:part:5:doc:2:revision:1"

# Удалить весь кэш модуля (осторожно!)
redis-cli --scan --pattern 'knowledge:*' | xargs redis-cli del
```

---

## Типовые административные операции

### Ручное создание категории

```bash
curl -X POST https://example.com/admin/knowledge/categories \
  -H "Authorization: Bearer $KNOWLEDGE_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Справочные материалы",
    "slug": "reference",
    "description": "Общие справочные документы",
    "sort_order": 0,
    "is_active": true
  }'
```

### Загрузка документа

```bash
curl -X POST https://example.com/admin/knowledge/documents \
  -H "Authorization: Bearer $KNOWLEDGE_ADMIN_TOKEN" \
  -F "file=@./instruction.pdf" \
  -F "title=Инструкция по настройке" \
  -F "categoryId=3" \
  -F "status=published"
```

### Импорт корпуса знаний

```bash
python services/generation/scripts/import_knowledge_base.py \
  path/to/knowledge-base \
  --base-url http://localhost:8080 \
  --token "$KNOWLEDGE_ADMIN_TOKEN" \
  --publish \
  --skip-existing
```

Параметры:
- `--publish` — установить статус `published` после загрузки
- `--skip-existing` — пропускать файлы с совпадающим SHA-256
- Исходные папки становятся категориями, каждый Markdown-файл — документом с частью `whole_file`

### Перевод документов в архив

```bash
# Перевести все документы старше 90 дней в archived
curl -X PATCH "https://example.com/admin/knowledge/documents?status=published&limit=100" \
  -H "Authorization: Bearer $KNOWLEDGE_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "archived"}'
```

Или через SQL:
```sql
UPDATE knowledge_document
SET status = 'archived', updated_at = NOW()
WHERE status = 'published'
  AND updated_at < NOW() - INTERVAL 90 DAY;
```

### Поиск дубликатов по checksum

```sql
SELECT checksum, original_filename, COUNT(*) AS cnt
FROM knowledge_document
WHERE deleted_at IS NULL
GROUP BY checksum
HAVING cnt > 1;
```

### Очистка удалённых документов (hard-delete)

```sql
-- Физически удалить документы, помеченные как удалённые более 30 дней назад
-- Внимание: также удалит связанные части (CASCADE)
DELETE FROM knowledge_document
WHERE deleted_at IS NOT NULL
  AND deleted_at < NOW() - INTERVAL 30 DAY;
```

После hard-delete необходимо вручную очистить файлы из `{KNOWLEDGE_STORAGE_PATH}`, которые больше не имеют ссылок в БД. Для этого можно использовать скрипт или запустить:

```bash
# Пример: найти все storage_key, проверить наличие в БД
# (требуется написание утилиты)
```

### Сброс кэша Redis

```bash
# Сбросить весь кэш модуля knowledge
redis-cli --scan --pattern 'knowledge:*' | xargs redis-cli del

# Или через ключ-префикс
redis-cli eval "return redis.call('del', unpack(redis.call('keys', 'knowledge:*')))" 0
```

---

## Безопасность

| Мера                                               | Статус                                         |
|----------------------------------------------------|------------------------------------------------|
| Валидация расширения загружаемых файлов            | ✅ Реализовано (ограниченный список)            |
| Защита от path traversal в LocalFileStorage        | ✅ Реализовано (`resolve()` проверяет .. /)     |
| Случайные storage-ключи (не угадать URL)           | ✅ Реализовано (16 байт random)                 |
| Файлы вне web-директории (недоступны напрямую)     | ✅ Реализовано                                  |
| Санитизация имени файла (basename, regex)          | ✅ Реализовано                                  |
| Soft-delete (возможность восстановления)           | ✅ Реализовано (deleted_at)                     |
| Транзакционность при создании/удалении документа   | ✅ Реализовано (beginTransaction/commit)        |
| Graceful degradation Redis (работа без кэша)       | ✅ Реализовано                                  |
| Валидация целостности ревизий при кэшировании      | ✅ Реализовано (проверка revision)              |
| Аутентификация на `/admin/*`                       | ❌ Нет (требуется интеграция с auth-модулем)    |
| Rate-limiting на загрузку файлов                   | ❌ Нет                                          |
| Аудит изменений (кто и когда менял)                | ❌ Нет (только created_at/updated_at)           |
| Антивирусная проверка загружаемых файлов           | ❌ Нет                                          |

---

## Troubleshooting

### "Knowledge category not found" при создании части

1. Проверить, что категория существует: `SELECT * FROM knowledge_category WHERE id = :id`
2. Убедиться, что передан именно `category_id`, а не `slug`

### "Unsupported file extension"

Разрешённые расширения: `md`, `txt`, `pdf`, `docx`, `html`, `htm`. Если требуется новый формат — добавить в `ALLOWED_EXTENSIONS` в `LocalFileStorage.php`.

### "File size limit exceeded"

Проверить `KNOWLEDGE_MAX_FILE_SIZE` в ENV (по умолчанию 20 МБ). При необходимости увеличить.

### "Knowledge part content is empty or exceeds the configured size limit"

Проверить `KNOWLEDGE_MAX_PART_SIZE` (по умолчанию 1 МБ). Текст части не может быть пустым после trim.

### "Cannot create knowledge storage directory"

1. Проверить права на запись в директорию `KNOWLEDGE_STORAGE_PATH`
2. Убедиться, что путь не заканчивается на несуществующий монтируемый раздел

### "Cannot create document directory" / "Cannot create part directory"

Проблема с созданием поддиректорий `{root}/documents/{xx}/` или `{root}/parts/{xx}/`. Проверить права на запись и свободное место на диске.

### "Category cannot be deleted while it has child categories or knowledge parts"

Перед удалением категории необходимо:
1. Переназначить или удалить дочерние категории
2. Переназначить или удалить привязанные части

### Утечка места на диске

1. Проверить размер хранилища: `du -sh {KNOWLEDGE_STORAGE_PATH}`
2. Найти файлы без ссылок в БД (storage_key в documents + content_storage_key в parts)
3. Запустить архивацию старых документов
4. Рассмотреть очистку Redis-кэша

### Redis-кэш не работает

1. Проверить соединение: `redis-cli ping` → `PONG`
2. Проверить логи категории `knowledge` на наличие `Redis cache ... failed`
3. Redis опционален — модуль продолжает работать, но без кэша retrieve будет медленнее

---
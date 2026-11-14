# Knowledge module

Модуль управляет структурой базы знаний и оригинальными файлами. PostgreSQL хранит метаданные и привязки категорий, сами документы и вручную заданные текстовые части хранятся в `KNOWLEDGE_STORAGE_PATH`. Redis — кэш извлечённого текста; ключи содержат category ID, revision документа и revision части. Небольшие части (до 256 KiB) передаются inline, крупные отдаются по внутренней ссылке. Python разбивает полученные части на перекрывающиеся фрагменты перед BM25-ранжированием.

## Данные

- `knowledge_category` — дерево категорий.
- `knowledge_document` — оригинальный файл, метаданные, статус и revision.
- `knowledge_part` — категоризированная часть документа. У части есть `locator_type` (`whole_file`, `heading`, `page_range`, `line_range`) и JSON locator. Необязательное поле `content` в CRUD сохраняется отдельным `.txt` файлом, а не в PostgreSQL.

Один документ может содержать несколько `knowledge_part` с разными категориями и локаторами. Именно части, а не документы целиком, передаются в retrieval.

## Admin API

Все `/admin/knowledge/*` endpoints требуют `Authorization: Bearer $KNOWLEDGE_ADMIN_TOKEN`.

| Метод            | Путь                                    | Назначение                                     |
|------------------|-----------------------------------------|------------------------------------------------|
| GET/POST         | `/admin/knowledge/categories`           | List / создание категорий                      |
| GET/PATCH/DELETE | `/admin/knowledge/categories/{id}`      | Read / update / удаление категории             |
| GET/POST         | `/admin/knowledge/documents`            | List / загрузка документа (`multipart file`)   |
| GET/PATCH/DELETE | `/admin/knowledge/documents/{id}`       | Read / обновление метаданных / удаление        |
| GET              | `/admin/knowledge/documents/{id}/file`  | Download оригинального файла                   |
| PUT              | `/admin/knowledge/documents/{id}/file`  | Замена оригинального файла, инкремент revision |
| GET/POST         | `/admin/knowledge/documents/{id}/parts` | List / создание категоризированных частей      |
| GET/PATCH/DELETE | `/admin/knowledge/parts/{id}`           | Read / update / удаление части                 |
| GET              | `/admin/knowledge/parts/{id}/content`   | Download вручную сохранённого текста части     |

Пример создания части (содержимое части записывается в файловую систему):

```json
{
  "category_id": 2,
  "title": "Размещение панелей на крыше",
  "locator_type": "heading",
  "locator": {"heading": "Варианты размещения"}
}
```

Либо передайте `content` вместо использования локатора. Содержимое сохраняется как локальный текстовый файл и кэшируется в Redis при извлечении. Документ может иметь несколько частей из разных категорий, например один Markdown-файл может отдавать свой заголовок `Тарифы` под `10-energy`, а заголовок `Расчёт окупаемости` — под `00-reference`. Форматы локаторов: `heading` — `{"heading":"..."}`; `page_range` и `line_range` — `{"start":1,"end":5}`; `whole_file` не требует значений локатора.

## Internal API

- `GET /internal/v1/knowledge/categories`
- `POST /internal/v1/knowledge/retrieve` с `{ "categorySlugs": ["10-energy"], "limit": 60 }`
- `GET /internal/v1/knowledge/documents/{id}/file` — байты оригинального файла
- `GET /internal/v1/knowledge/parts/{id}/content` — сохранённый текст части, или HTTP 204, если часть указывает на оригинальный файл
- `POST /internal/v1/knowledge/parts/{id}/cache` — кэшировать извлечённое содержимое с revision документа/части

Retrieval возвращает inline-содержимое, если оно уже есть в Redis (или если можно прочитать вручную сохранённый файл части). В противном случае возвращаются `contentUrl`, `documentUrl` и локатор. Python затем открывает источник через внутренний API, извлекает часть и просит PHP закэшировать её.

## Безопасность и хранение

- Оригинальные файлы не находятся под `web/` и не могут быть скачаны угадыванием публичного URL.
- Storage-ключи генерируются на стороне сервера; имена файлов клиента — только метаданные.
- Разрешённые расширения загрузки: `md`, `txt`, `pdf`, `docx`, `html`, `htm`.
- Ограничение файла по умолчанию: 20 MiB; лимит вручную введённой текстовой части: 1 MiB; лимит inline-кэша Redis: 256 KiB.
- Admin API защищён токеном. Настройте длинный случайный admin-токен.
- Internal API использует отдельный сервисный токен. Смените значения по умолчанию из Compose перед развёртыванием в shared- или production-окружении.
- Изменения revision документа и части приводят к новым ключам кэша, поэтому устаревший извлечённый текст не извлекается.

## Локальный запуск

Модуль предоставляет административный REST API; отдельная CRUD-страница во frontend пока не входит в этот MVP. Chat widget уже вызывает реальный `/generation/chat`, но создание/история сессий остаются локальной демо-реализацией.

1. Скопируйте `.env.example` в `.env`, задайте `KNOWLEDGE_ADMIN_TOKEN`, `INTERNAL_SERVICE_TOKEN` (разные случайные секреты) и `AI_API_KEY`.
2. Установите зависимости импортёра: `pip install -r services/generation/requirements.txt` (для тестов также установите `services/generation/requirements-dev.txt`; самому импортёру нужен только `httpx`).
3. Соберите и запустите стек: `docker compose up -d --build`.
4. Примените миграцию схемы, как показано ниже.
5. Импортируйте начальный корпус скриптом ниже.

Пример загрузки:

```bash
curl -X POST http://localhost:8080/admin/knowledge/documents \
  -H "Authorization: Bearer $KNOWLEDGE_ADMIN_TOKEN" \
  -F "title=Solar generation" \
  -F "category_id=3" \
  -F "status=published" \
  -F "file=@./solar.md"
```

Пример запроса в чат (браузер вызывает тот же endpoint через `/api`):

```bash
curl -X POST http://localhost:8080/generation/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"Можно ли поставить панели на фасад?","debug":true}'
```

## Миграция

```bash
docker compose exec php-fpm php yii migrate --interactive=0
```

## Импорт начального корпуса

Из корня репозитория после запуска контейнеров. Замените плейсхолдер токена значением `KNOWLEDGE_ADMIN_TOKEN` из `.env` (того же файла, который читает Compose):

```bash
python services/generation/scripts/import_knowledge_base.py knowledge-base \
  --base-url http://localhost:8080 \
  --token "<KNOWLEDGE_ADMIN_TOKEN>" \
  --publish --skip-existing
```

Три исходные папки становятся категориями (`Справочные материалы`, `Энергетика`, `Продукты`), и каждый Markdown-файл получает часть `whole_file`. Импортёр также принимает ZIP с одной обёрточной папкой или без неё. Добавьте `--skip-existing`, чтобы пропускать файлы с совпадающей контрольной суммой SHA-256. Администраторы могут разбивать документы на отдельные части и переназначать категории через API.

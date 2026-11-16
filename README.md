# МТС Energytool — ИИ-консультант для сайта

Проект команды Script Agency для Hack&Change 2026. Исходный код и материалы распространяются на условиях закрытой лицензии — см. [LICENSE](LICENSE.md).

## Команда

| Участник                      | Роль в Script Agency               | Роль в проекте                                           |
|-------------------------------|------------------------------------|----------------------------------------------------------|
| Кузнецов Данила Алексеевич    | CEO & Founder, Fullstack Developer | Архитектор и руководитель backend, backend-разработчик   |
| Михайлов Кирилл Николаевич    | Frontend Developer                 | Архитектор и руководитель frontend, frontend-разработчик |
| Некрасов Михаил Александрович | Frontend Developer                 | Frontend-разработчик                                     |
| Покумин Никита Дмитриевич     | Fullstack Developer                | Backend, DevOps, Python-модули                           |
| Коротаев Артём Юрьевич        | Backend Developer                  | Backend, AI-интеграция и внешние Python-модули           |

## Назначение

ИИ-консультант помогает посетителю сайта Energytool сформулировать задачу, уточняет обстоятельства, ищет подтверждённую информацию в базе знаний, объясняет подходящее решение и при согласии пользователя формирует заявку менеджеру с резюме диалога.

## MVP

- Веб-чат и анонимные диалоговые сессии.
- Контекст в пределах одной сессии и полный сброс при создании нового диалога.
- Сохранение истории всех сессий, включая разговоры без заявок.
- RAG по предоставленной базе знаний.
- Уточняющие вопросы, рекомендации простым языком и отказ от неподтверждённых ответов.
- Сбор ФИО, телефона и компании после согласия пользователя.
- Резюме диалога и сохранение заявки.
- Debug-режим: время ответа и использованные документы.
- REST API, OpenAPI/Swagger и Docker-запуск.

## После MVP

Passport OAuth2, роли сотрудников, CRM/email интеграции, потоковая генерация, расширенная аналитика, управление версиями базы знаний, масштабирование workers и дополнительные каналы коммуникации.

## Стек

PHP 8.1 + Yii2 (Clean Architecture, DDD, CQRS); Python generation service; React 19 + TypeScript (FSD, встраиваемый микрофронтенд); PostgreSQL; Redis; transactional outbox; Docker Compose; Markdown и OpenAPI/Swagger. pgvector — кандидат для векторного поиска, окончательный выбор подтверждается тестами.

## Структура

```text
.
├── backend/                 # Yii2 REST API, Core и PHP-модули
│   ├── core/
│   ├── modules/
│   └── docs/specification/
├── frontend/                # React + TypeScript, встраиваемый микрофронтенд на FSD
│   ├── src/
│   ├── demo/                # Демо-страница сайта Energytool
│   └── docs/
├── services/                # Python-сервисы, включая generation
│   ├── generation/          # Python FastAPI (RAG + оркестрация)
│   │   ├── app/             # Код сервиса
│   │   └── scripts/         # Скрипты импорта базы знаний
│   └── ...
├── docker/                  # Dockerfile и конфиги для сервисов
│   ├── backend/
│   └── frontend/
├── infrastructure/          # Общие инфраструктурные материалы
├── docs/                    # Требования, архитектура, планы, ADR, эксплуатация
├── docker-compose.yml
├── .env.example             # Образец переменных окружения (скопировать в .env)
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE.md
└── README.md
```

---

## Зависимости

Для запуска проекта необходимы:

| Зависимость                  | Минимальная версия | Назначение                                                 |
|------------------------------|--------------------|------------------------------------------------------------|
| **Docker Engine**            | 24.x               | Контейнеризация всех сервисов                              |
| **Docker Compose plugin**    | 2.x                | Оркестрация многоконтейнерного приложения                  |
| **Git**                      | любая              | Клонирование репозитория и переключение веток              |
| **OpenAI-compatible API**    | —                  | Тестовый AI-провайдер (OpenAI, GigaChat, YandexGPT, LM Studio, Ollama и др.) |

ОС: любая, поддерживающая Docker (Linux, macOS, Windows с WSL2 или Docker Desktop).

Никакие дополнительные инструменты (PHP, Python, Node.js) на хосте **не требуются** — всё работает внутри контейнеров.

---

## Переменные окружения (`.env`)

### Подготовка

```bash
cp .env.example .env
```

### Описание параметров

Все переменные сгруппированы по блокам. Обязательные для **dev-запуска** помечены ⚠️.

### Блок: PostgreSQL

| Переменная           | Значение по умолч.  | Зачем нужна                                                  |
|----------------------|---------------------|--------------------------------------------------------------|
| `POSTGRES_DB`        | `hackaton`          | Имя базы данных, создаваемой при старте контейнера            |
| `POSTGRES_USER`      | `postgres`          | Имя пользователя БД                                          |
| `POSTGRES_PASSWORD`  | `secret`            | Пароль пользователя БД                                       |
| `POSTGRES_HOST`      | `postgres`          | DNS-имя хоста PostgreSQL (всегда `postgres` внутри Docker)   |
| `POSTGRES_PORT`      | `5432`              | Порт PostgreSQL, видимый **снаружи** контейнера               |

`POSTGRES_HOST` и контейнерный порт `5432` жёстко зашиты в `DB_DSN` для php-fpm.  
Параметр `POSTGRES_PORT` меняет только внешний маппинг (удобно, если локально занят 5432).

### Блок: Redis

| Переменная        | По умолч. | Зачем нужна                                                 |
|-------------------|-----------|-------------------------------------------------------------|
| `REDIS_HOST`      | `redis`   | DNS-имя хоста Redis (всегда `redis` внутри Docker)          |
| `REDIS_PORT`      | `6379`    | Порт Redis (контейнерный; наружу НЕ маппится)               |
| `REDIS_PASSWORD`  | *(пусто)* | Пароль Redis (пустая строка для dev-окружения)              |

Redis используется для кэширования базы знаний и transactional outbox. Пароль зашит в docker-compose как пустой для dev.

### Блок: Backend (PHP Yii2)

| Переменная                  | По умолч.                            | Зачем нужна                                                |
|-----------------------------|---------------------------------------|------------------------------------------------------------|
| `APP_ENV` ⚠️                | `dev`                                 | Режим приложения: `dev` (включает debug и gii) / `prod`    |
| `APP_DEBUG`                 | `true`                                | Включает Yii2 debug-панель (`true` / `false`)              |
| `APP_NAME`                  | `Script Agency Energytool`            | Название приложения (используется в идентификаторах)       |
| `DEBUG_LVL`                 | `3`                                   | Детализация ошибок: 0 — Yii2 debug, 1 — +trace, 2 — +request, 3 — всё |
| `APP_URL`                   | `http://localhost:8080`               | Базовый URL для генерации абсолютных ссылок                |
| `COOKIE_VALIDATION_KEY`     | `docker-dev-key-...`                  | Ключ для валидации и подписи cookie (сменить в production!) |
| `ADMIN_EMAIL`               | `admin@example.com`                   | Email администратора для уведомлений                        |
| `SENDER_EMAIL`              | `noreply@example.com`                 | Email отправителя (письма, заявки)                         |
| `SENDER_NAME`               | `Script Agency Energytool`            | Имя отправителя писем                                      |

### Блок: Frontend

| Переменная      | По умолч.         | Зачем нужна                                                |
|-----------------|-------------------|------------------------------------------------------------|
| `FRONTEND_URL`  | `http://localhost` | Базовый URL фронтенда (используется для CORS и ссылок)     |

### Блок: Порты (снаружи контейнера)

См. раздел «Порты» ниже.

### Блок: AI (OpenAI-compatible) ⚠️

| Переменная               | По умолч.                    | Зачем нужна                                              |
|--------------------------|-------------------------------|----------------------------------------------------------|
| `AI_BASE_URL` ⚠️         | `https://api.openai.com/v1`  | Базовый URL API AI-провайдера. Замените для:             |
|                          |                               | - **LM Studio / Ollama**: `http://host.docker.internal:1234/v1` |
|                          |                               | - **Yandex GPT**: `https://llm.api.cloud.yandex.net`     |
|                          |                               | - **GigaChat**: `https://gigachat.devices.sberbank.ru`   |
| `AI_API_KEY` ⚠️          | *(пусто)*                     | API-ключ провайдера. **Обязателен.**                     |
| `AI_MODEL` ⚠️            | `gpt-4o-mini`                 | Имя модели у провайдера                                  |
| `AI_HTTP_TIMEOUT`        | `300`                         | Тайм-аут HTTP-запроса к AI API (секунд)                  |
| `AI_CONNECT_TIMEOUT`     | `15`                          | Тайм-аут установки соединения с AI API (секунд)          |
| `AI_MAX_RETRIES`         | `2`                           | Количество повторов запроса при ошибке                   |

### Блок: Generation Service (Python)

| Переменная                       | По умолч.                  | Зачем нужна                                             |
|----------------------------------|----------------------------|---------------------------------------------------------|
| `PHP_INTERNAL_API_URL`           | `http://nginx-backend`     | Внутренний URL бэкенда (внутри Docker-сети)             |
| `INTERNAL_SERVICE_TOKEN`         | `HAKATON_NO_AUTH`          | Токен аутентификации межсервисных запросов              |
| `PHP_HTTP_TIMEOUT`               | `60`                       | Тайм-аут запроса от generation к PHP-бэкенду (сек)      |
| `PHP_AI_GATEWAY_TIMEOUT`         | `180`                      | Тайм-аут генерации ответа AI (макс. ожидания) (сек)     |
| `GENERATION_TOP_K`               | `6`                        | Количество релевантных чанков для RAG (1–12)            |
| `GENERATION_MAX_CONTEXT_CHARS`   | `24000`                    | Максимальная длина контекста в символах (≥4000)         |
| `GENERATION_CHUNK_SIZE_CHARS`    | `3500`                     | Размер одного чанка документа (≥800)                    |
| `GENERATION_CHUNK_OVERLAP_CHARS` | `350`                      | Перекрытие между соседними чанками                      |
| `GENERATION_KNOWLEDGE_LIMIT`     | `30`                       | Максимум загружаемых документов из базы знаний (1–100)  |

### Блок: Knowledge Base

| Переменная                         | По умолч.           | Зачем нужна                                              |
|------------------------------------|---------------------|----------------------------------------------------------|
| `KNOWLEDGE_STORAGE_PATH`           | `/app/storage/knowledge` | Путь к файлам базы знаний внутри PHP-контейнера          |
| `KNOWLEDGE_MAX_FILE_SIZE`          | `20971520` (20 MB)  | Максимальный размер загружаемого файла (байт)             |
| `KNOWLEDGE_MAX_PART_SIZE`          | `1048576` (1 MB)    | Максимальный размер части файла (байт)                    |
| `KNOWLEDGE_MAX_INLINE_PART_BYTES`  | `262144` (256 KB)   | Максимальный размер инлайн-части (байт)                   |
| `KNOWLEDGE_REDIS_TTL`              | `3600` (1 час)      | Время жизни кэша знаний в Redis (секунд)                  |
| `GENERATION_SERVICE_URL`           | `http://generation:8000` | URL Python-сервиса генерации (внутри Docker-сети)         |
| `GENERATION_HTTP_TIMEOUT`          | `180`               | Тайм-аут запроса PHP → generation (секунд)               |
| `GENERATION_CONNECT_TIMEOUT`       | `5`                 | Тайм-аут соединения PHP → generation (секунд)             |

---

## Порты

### Сводная таблица

| Порт  | Сервис            | Назначение                                                              | Кто использует                             | Виден снаружи |
|-------|-------------------|-------------------------------------------------------------------------|--------------------------------------------|:---:|
| 80    | nginx-frontend    | Демо-страница Energytool + раздача `widget.js` и ассетов               | Браузер, curl                             |  ✓  |
| 8080  | nginx-backend     | REST API бэкенда (эндпоинты `/api/v1/...`) + Swagger + `widget.js`     | Frontend, generation, браузер (Swagger)    |  ✓  |
| 8000  | generation        | Python FastAPI: RAG-эндпоинт `/v1/generation/chat` и `/health`         | PHP-бэкенд (внутренний), внешняя отладка   |  ✓  |
| 5432  | postgres          | Основная база данных (сессии, сообщения, заявки, документы)             | php-fpm (через nginx-backend)              |  ✓  |
| 6379  | redis             | Кэш базы знаний, transactional outbox                                  | php-fpm, generation                        |  —  |
| 9000  | php-fpm (PHP-FPM) | FastCGI-обработчик PHP-запросов (Yii2)                                  | nginx-backend (только внутри)              |  —  |

### Детально

**80 — nginx-frontend (FRONTEND_PORT)**
- Отдаёт статическую демо-страницу (`frontend/demo/index.html`) и собранный виджет (`widget.js`).
- Демо-страница имитирует сайт Energytool и подключает виджет ИИ-помощника.
- Используется браузером разработчика и заказчика для проверки.

**8080 — nginx-backend (BACKEND_PORT)**
- Проксирует все PHP-запросы в php-fpm (FastCGI на порт 9000).
- REST API бэкенда: `/api/v1/sessions`, `/api/v1/sessions/{id}/messages`, `/api/v1/sessions/{id}/leads` и др.
- Документация OpenAPI/Swagger UI: `http://localhost:8080/docs/swagger`.
- Также отдаёт скомпилированный виджет по пути `/admin/widget` (используется демо-страницей).
- Используется фронтендом (через AJAX), Python generation service и браузером (для Swagger).

**8000 — generation (GENERATION_PORT)**
- Python FastAPI-сервис, реализующий RAG-пайплайн и оркестрацию диалога.
- Эндпоинты: `GET /health` (healthcheck), `POST /v1/generation/chat` (генерация ответа).
- Вызывается PHP-бэкендом по внутренней сети Docker. Наружу проброшен для отладки.

**5432 — postgres (POSTGRES_PORT)**
- PostgreSQL: хранение сессий диалогов, сообщений, заявок, документов базы знаний.
- Все сервисы (php-fpm, generation) обращаются через внутреннюю сеть Docker.
- Наружу проброшен для подключения GUI-клиентов (DBeaver, pgAdmin) при разработке.

**6379 — redis**
- Redis: кэширование данных базы знаний (KnowledgeCache), временные очереди outbox.
- Доступен только внутри Docker-сети (php-fpm, generation). Не маппится наружу.

**9000 — php-fpm (внутренний)**
- PHP-FPM (FastCGI Process Manager): непосредственно выполняет PHP-код Yii2.
- Слушает только внутри контейнера. nginx-backend проксирует к нему FastCGI-запросы.

---

## Запуск (dev-версия)

### Требования

- **Docker Engine 24.x+** и **Docker Compose plugin 2.x+**
- **Git**
- **API-ключ** от любого OpenAI-совместимого провайдера (OpenAI, GigaChat, YandexGPT, LM Studio, Ollama)
- **Архив с базой знаний** компании (предоставляется отдельно)

### Пошаговый процесс

#### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd <project-directory>
```

#### 2. Переход в ветку dev

```bash
git checkout dev
```

#### 3. Создание .env из образца

```bash
cp .env.example .env
```

#### 4. Настройка AI-провайдера

Откройте `.env` в любом редакторе и заполните блок AI:

```bash
# Минимально обязательные поля:
AI_BASE_URL="https://api.openai.com/v1"
AI_API_KEY="sk-..."           # <-- ваш реальный ключ
AI_MODEL="gpt-4o-mini"        # или другая доступная модель
```

**Подсказки для популярных провайдеров:**

| Провайдер            | AI_BASE_URL                                          | Пример модели         |
|----------------------|------------------------------------------------------|-----------------------|
| OpenAI               | `https://api.openai.com/v1`                         | `gpt-4o-mini`        |
| GigaChat             | `https://gigachat.devices.sberbank.ru/api/v1`       | `GigaChat:latest`    |
| Yandex GPT           | `https://llm.api.cloud.yandex.net`                   | `yandexgpt/latest`   |
| aitunnel.ru          | `https://api.aitunnel.ru/v1`                   | `deepseek-v4-flash`   |

#### 5. Запуск контейнеров

```bash
docker compose up -d
```

Команда запускает все сервисы в фоне:
- `postgres` — база данных
- `redis` — кэш и очереди
- `php-fpm` — PHP-бэкенд (Yii2)
- `nginx-backend` — прокси к PHP (порт `BACKEND_PORT:8080`)
- `generation` — Python-сервис генерации (порт `GENERATION_PORT:8000`)
- `nginx-frontend` — демо-страница с виджетом (порт `FRONTEND_PORT:80`)

Проверьте, что все контейнеры запущены:

```bash
docker compose ps
```

#### 6. Запуск миграций базы данных

```bash
docker compose exec php-fpm php /app/yii migrate
```

Создаёт таблицы: сессии, сообщения, заявки, документы базы знаний, аудит и outbox.

#### 7. Загрузка базы знаний

Распакуйте предоставленный архив с базой знаний в папку:

```bash
mkdir -p ./services/generation/scripts/data # если папка не создана (хотя должна быть создана 🤔)
# Распакуйте архив сюда (структура: data/<категория>/<файлы>)
```

Структура папок в архиве определяет категории знаний. Поддерживаемые форматы файлов:
`.md`, `.txt`, `.pdf`, `.docx`, `.html`, `.htm`.

#### 8. Импорт базы знаний в систему

```bash
docker compose exec generation python /app/scripts/import_knowledge_base.py /app/scripts/data --base-url http://nginx-backend --token "HAKATON_NO_AUTH" --publish --skip-existing
```

Параметры:
- `/app/scripts/data` — путь к файлам знаний внутри контейнера generation
- `--base-url http://nginx-backend` — внутренний URL PHP-бэкенда (API импорта)
- `--token "HAKATON_NO_AUTH"` — токен для доступа к API (в dev-режиме — `INTERNAL_SERVICE_TOKEN` из `.env`)
- `--publish` — сразу опубликовать импортированные документы
- `--skip-existing` — пропускать уже импортированные файлы

#### 9. Открытие демо-страницы

Откройте в браузере: **[http://localhost:80/demo](http://localhost:80/demo)**

Вы увидите демо-страницу сайта Energytool с плавающим виджетом ИИ-помощника справа снизу.

#### 10. Проверка пользовательских сценариев

- **Отправка сообщения:** нажмите на иконку чата, напишите вопрос (например, «Как установить счётчик?»).
- **Уточнение:** ИИ-помощник задаст уточняющие вопросы на основе найденных документов.
- **Заявка:** после ответов согласитесь на передачу контактов → заполните ФИО, телефон, компанию → заявка создана.
- **История:** переключитесь на экран истории диалогов.
- **Debug-режим:** в виджете включён `debug: true` (видно время ответа и источники).
- **Новый диалог:** вернитесь на главную и начните новый чат — старый контекст сброшен.

---

## Реализованное решение

### Описание кейса

**Energytool** — сервис цифровизации энергетики и учёта энергоресурсов от МТС. Компания предлагает комплекс программных решений: оптимизация энергетических расходов, выявление подозрительной активности абонентов, автоматизация сбора и анализа данных.

Потенциальные клиенты приходят на сайт и сталкиваются с необходимостью:
- Разобраться в многообразии тарифов и услуг
- Понять, какое решение подходит именно для их бизнеса
- Получить быстрый ответ без ожидания звонка менеджера

**Задача хакатона:** создать ИИ-консультанта, который заменит первый контакт с менеджером и поможет пользователю:
1. ✅ Сформулировать свою задачу на естественном языке
2. ✅ Получить релевантную информацию из базы знаний компании
3. ✅ Принять решение и оставить заявку на подключение услуги

### Как это работает

> Общий смысл
>
> ![картинка](https://www.plantuml.com/plantuml/png/NLBFRjCm7BxxANwK2mXwuW8Sq394nyI1YeAux68b9elcs9Nh0XL2eaL2GaEQuBGRuWsYGLdMiVOLVduZFf9KJSaXTVtx_doVdPsHbywFSosk-KELAnfgcHanEihCK3gPKsppeJNA-86VQ4LEnLwQLAiM956lv5Zxv-gjZtIMcXneYl5IheMAdBDl7bfj7Ls_KpsRuKQMtWd2iolZezJPiKaQHkzkxrulgcVM9SfjAxqNGiOU6nt-pak-35_u7BzdN8GPpnd_EoH7z6A4I1kl3l_WWY_2Z1uPvTA9jrPNk47crqdQw6zSyY_-pVCmEp1yogTTNi7b3o_3Pxx2SC55nN-P9QdoIDKswq_yeJMqf-0bVORbGBdNMQmEp8rdqHxT8kXyu0Nafs66LH4-SHbE29ubSbx2wYSNDoi7g3JiBO-dGsMYVOhw-n05UevOyurKpQr1RHf_XVuv5uJN5HTLbmiem7d9Y_0H5Q64KCUrmfFThMAF-zM5APE04wPLWIaaojiGXFS9dw5MMNE15kBVHL2t-w0vARfFN8AoMjyTB778efa2s2eCC4ELL-YrXDEn4AqXi4t1_tSHUdkdZhA3sFZ-_m80)

> Подробная диаграмма
>
> ![картинка2](https://www.plantuml.com/plantuml/png/dLTlRnD74tz_ds8KNZosi6Cd93p1KXum8Gvv7Wci9EXHXL5qEQ-TLSwxxkuvmOeiXQ2MIgMgYYfLwXlweX_01TA64DAlSFSL-2ITkVNzkSF92uI4RtTcPsP_yvkToHtjsSeRz5peCi6KxN4foXqbXST4k-pOhclz2rRm1pgkFAX1OoA2Jz--WkRz9XI-uhneLaDlLmeeD6pjrPlhnKJbVq8UkApTPPKLszbbAKbz7TPiZntOGxE9Q_hPOBelXMQMfVUuwDlAxi6X1N3NTlQwIWv4UqMwKi6rnbBZLgEEaYRUWZkyRmllhbHjfYOAywiBrSKRMOK6Nc4YdglFrUTNKVn0UYntSEdcoXnAwah9W-pcoB9sv5EOYS4e-A_yK_-T_wT_4XmNP-3QlSNLfNiBUBgVk8MPj5PBh2BUtU6Mb6vTQwuzL9a1MyF_EIBbMMGNlKnS4LfqUzmra9EJXTMRZRcy4zBSa0EFgPQe94cjEBksiT_SxHjv_kHQhBo2zrBITSb6mVyxEF8l_BFWcNzQZ2mqbNmwp1k8ymoOV_JE1NeHTcL_hh8NYK83iMAzp_D64afaBTWykKATJrJoA1aA9XU1JQRskSDQ8g8br9QgrIh1rrYaVtdtaHgwd8fUAE_pox6BFTf27p1LC92XV2Au5BGeQOf-9yVCtkL7cASusmzFcS_uO2IPGeyLbpFXjSJzhQrcsJ_pFo0hJ_oFmN6KNAEGO6ixdbH8tzT8Wm_1I_yl_7tZZuDZF8RhyDWZZRwivMMOcuNB5C6_m4-YqzX_Wni_KY40VbuOZWNFO7dP8ajG_i-a3cePkMKsKPpGk0RDXvjRKB7xF9-nbZZyUi0qhKlGOrhRNQPBu21vkb8DjxKxwEhPsTcH9QJ7GF7kBZeKNIwUGfhsmL7md68DdSIlruwfHykAGg6mu-AeWUs4jOHn58eP1rY_G5dceXiQcr9u1ilvMN8qDHI49Nfn4RF8AGOGCTJ0Cet7M0mc8_u5O8h64RZ-6FmpN9u1EdWM70SlYs4KD-ACFWzU45E8BwHg4liMpnxXrlimlHGmHJI9WW9Ak5-3IL4e5kQbQ2Kor4ouLujon9b6yE9zLCey7ZLOMzs2gGzD9R5WfOz0EUleyI6ne0J2xh4Ij9bs5EyJLgCI83MUf9tdBkDoxO7if68DyLf0l7v3B9uZFAU8rbjC84AT1mpfVuv8vI28E6rUWOIzYOyITAHoMDkmjsYP4vy5zrWpbpbUfFUa555kcukE30DTd9xOTyGrPDcvUHMeXf4dA1s76k-d11szDXYt-Ko7dWsa19xiR-yLhVXGDlE9XMoPbX3k7lUMRrIlv0EI_Z92H8RnLOXCRwOiZwwcINm6IIATGGztrzkObt04y6wNMYBwVgJSH2TSk18FInKIQfHdL0eyxh6UuT1DJCql2FXRgdS4_ymKvmKbnAG5DmfKf_Hy0oRcX5u4BbmkM1dJzqFmdNzIn5HTYdE7USxkzixGmn9JpBKzli-s1yejKiz_HyzpwaBWdvAZzBM-i2mHWag7k-nAjCEeu7eKGDaRzjdbi2dxm9m8eVitGlShtPyUIzE08cQV8fBOU12s5y5FkFaHnLYDG9ZIyqgeNWMPG-FhDlNJ0lqNP_zB6Kb6TEMGjqSLCatCZ03UOFjSX-M3IiagyfZjM6lATbXdu4ARTPNTDgFFfwEVMyA_81pyFmo132t6XYwu-O4gFUaffZ-_eSyGoIL4ybNmlMdZE9ld2Z-73VKvFTH8uUs-ahs-bxJSB3x9-3O579j7dTlOQkPCZQpuTCwK_phfabGB3_jCrDVBk2GEd9kUXbYSuutUquIQMChJxt22CZwrN72zky5iJU0FA8JH5Hq1CLBHtow4u2r4yFVmkJ-VmaOpsY0bKJBEmE-FyrYd6_kXwQ8bq7AW7ARZfvtwrywWUtkKjD_CH39VhS9_Dny-ICqBsKcAX53uVDxmppyR3T9JJpAjXHRAoKNID3KPEeKq9uDlQYsnM9qdjjBeCBdlgb9IaM0X56pn7aDNj54DDzODOLnWf6X5Oo45GkDZBGKbN4UaAMRSUa7G4-CjwmuJxK7F_GS0)

#### Шаг 1. Пользователь задаёт вопрос

Посетитель сайта нажимает на кнопку консультанта, открывается чат-виджет. Пользователь пишет вопрос на естественном языке, например:

> «Хочу установить трёхфазный счётчик на производстве, какие документы нужны?»

#### Шаг 2. Оркестрация и RAG

Python Generation Service:
- Получает вопрос и историю диалога от PHP-бэкенда
- Формирует поисковый запрос для базы знаний
- Находит релевантные документы (ранжирование по чанкам)
- Собирает контекст: найденные документы + история диалога + системный промпт

#### Шаг 3. Ответ AI с источниками

Generation Service отправляет контекст в AI-провайдер (OpenAI-compatible API). Модель:
- Отвечает строго на основе предоставленных документов
- Если информации недостаточно — задаёт уточняющие вопросы
- Если документы не подтверждают ответ — сообщает об этом

Ответ возвращается пользователю вместе со списком источников (названия документов, разделы).

#### Шаг 4. Уточнение и/или оформление заявки

- ИИ может задать несколько уточняющих раундов (мощность, тип объекта, регион)
- Когда достаточно информации, помощник предлагает оставить заявку
- Пользователь соглашается → вводит ФИО, телефон, компанию
- PHP-бэкенд сохраняет заявку с полным резюме диалога

#### Шаг 5. Передача менеджеру

Заявка появляется в CRM-интерфейсе менеджера с полным контекстом переписки. Менеджер сразу видит, что нужно клиенту, и не тратит время на повторное выяснение.

### Архитектурные решения

- **Доменный слой PHP** — единственное место истины для данных (сессии, сообщения, заявки).
- **Python в роли оркестратора** — RAG и логика диалога изолированы от доменной модели.
- **AI-провайдер заменяем** — через OpenAI-совместимый API (достаточно поменять URL и модель).
- **Встраиваемый микрофронтенд** — React-виджет упакован в один JS-файл, работает через Shadow DOM, не влияет на сайт хостера.
- **Docker Compose** — полное окружение поднимается двумя командами.

### Пользовательские сценарии (проверка)

| Сценарий                                      | Описание                                                        |
|------------------------------------------------|-----------------------------------------------------------------|
| **Новый диалог**                               | Начать чат → задать вопрос → получить ответ с источниками       |
| **Уточнение**                                  | AI запрашивает дополнительные детали (мощность, регион и т.д.)  |
| **Отказ от неподтверждённого ответа**          | AI сообщает, что информация отсутствует в базе знаний           |
| **Оформление заявки**                          | Согласие на передачу контактов → ввод данных → сохранение заявки|
| **История диалогов**                           | Просмотр всех предыдущих сессий                                 |
| **Debug-режим**                                | Отображение времени ответа и списка использованных документов   |
| **Новый диалог после заявки**                  | Сброс контекста, начало нового чата без потери предыдущей заявки|

---

## Запуск (общая информация)

Требуются Docker Engine и Docker Compose plugin.

```bash
cp .env.example .env
# заполнить локальные параметры и ключ тестового AI-провайдера
docker compose up --build
```

Миграции и загрузка тестовой базы знаний выполняются командами из `backend/README.md` и README Python-сервиса. Адреса и порты должны соответствовать фактическому compose-файлу. Не коммитьте `.env` и реальные секреты.

---

## Диагностика

```bash
# Статус контейнеров
docker compose ps

# Логи всех сервисов
docker compose logs -f

# Логи конкретного сервиса
docker compose logs -f php-fpm
docker compose logs -f generation
docker compose logs -f nginx-backend

# Проверка healthcheck
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# Доступ к контейнеру
docker compose exec php-fpm sh
docker compose exec generation sh
```

При сбое AI API проверьте:
1. Правильность `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` в `.env`
2. Доступность хоста провайдера из контейнера: `docker compose exec php-fpm curl $AI_BASE_URL/models`
3. Лимиты запросов и баланс аккаунта провайдера

Перед передачей логов удалите секреты и контакты. Удаление Docker volumes может уничтожить локальную БД:

```bash
docker compose down -v  # ОСТОРОЖНО: удалит все данные!
```

---

## Документация

- [Общая документация](docs/README.md)
- [Требования хакатона](docs/requirements/HACKATHON_REQUIREMENTS.md)
- [Архитектура](docs/architecture/SYSTEM_ARCHITECTURE.md)
- [План реализации](docs/implementation/IMPLEMENTATION_PLAN.md)
- [Этапирование](docs/implementation/ROADMAP.md)
- [ADR](docs/decisions/README.md)
- [Локальная разработка](docs/operations/LOCAL_DEVELOPMENT.md)
- [Backend](backend/README.md) · [Backend specification](backend/docs/specification/README.md)
- [Frontend](frontend/README.md) · [Frontend docs](frontend/docs/README.md)
- [Import Knowledge Base](services/generation/scripts/README.md)
- [Contributing](CONTRIBUTING.md) · [Code of Conduct](CODE_OF_CONDUCT.md) · [License](LICENSE.md)

Документация описывает целевое состояние и план. Она не утверждает, что весь перечисленный функционал уже реализован.
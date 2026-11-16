# Архитектура системы
**Статус:** Proposed baseline.

## Цели
PHP Core — единственный источник истины для доменных данных; RAG и оркестрация изолированы в Python; AI-провайдер заменяем; frontend не содержит бизнес-правил и секретов; система воспроизводимо запускается в Docker.

## Логическая схема
![Scheme](https://www.plantuml.com/plantuml/png/TP9DRi8m48NtFiN8-snwW8eV0er46vg0Q9Sc6O95OYFRbB9irxr3Ju5KgLBF46vKMr6G6z58bZsJz_dbsUbfmvJPLoKfSMt0I52ys1Z8kSBCS2c8tdAnOufLe3SibmSk2bYpKYCXB3DI0Qq_wv_pMtqwlzTVTfpgx_C71QPXGTmcJ1Gb0atGoc6UGiKp9OEraiAWo2aqZzEFGn-OtStWcVCRIC9q3lrPT95U0Dli4aEfi2FqYM6S_3KvceqKC461YhcyaA9wuHdI2p897xec_GWcpE217UaL4_lQ1-8TYduKPBBQMOTLYPqi5fXExqdE35inZM0jf3Q5mlHnIl_BCHhuGBmtA_aAjYwHNWVYnNmGFtdVrK87gRQew5LewPiac7FTqNNqIJYAKa8M40ItxZR7eLkvlCGEjsuke2tSqThHYAocwRhJS39NsA2jketGJAu3Ix9qS-FhTlAg7ehS_jU_)

## PHP Core
Core владеет доменными данными и правилами: сессии, сообщения, заявки, документы базы знаний, версии и события. Он не зависит от AI-провайдера, Redis SDK, Python HTTP-клиента или frontend.

Предполагаемые слои: `application/{command,dto,handler,port,query,useCase}`, `domain/{entity,enum,event,exception,valueObject}`, `infrastructure/{bootstrap,event,handler,listener,migrations,persistence,repository,storage}`, `presentation/{controller,request,swagger,view}`, `security`.

## PHP-модули
- `ai` — адаптер к OpenAI-compatible API: нормализация, тайм-ауты, ошибки. Не содержит консультативной бизнес-логики.
- `lead` — сценарий передачи клиента менеджеру. Долговременная доменная запись остаётся под контролем Core.
- knowledge может быть выделен в PHP-модуль при необходимости; Core сохраняет владение доменными инвариантами.

## Python Generation Service
Отдельный процесс для orchestration хода диалога, retrieval, сборки контекста, выбора ответа/уточнения/отказа/handoff, вызова AI Gateway и сбора timing/source metadata.

**Граница:** Python не может напрямую импортировать PHP-классы или использовать PHP DI как библиотеку. Взаимодействие «Python использует PHP Core/модули» реализуется через внутренние версионированные HTTP API/JSON-контракты (OpenAPI/JSON Schema), а не прямой импорт.

Python не владеет долговременной историей, заявками или продуктовой базой знаний. Redis допустим для временного состояния и кэша.

## Взаимодействие
Внутри PHP DI связывает интерфейсы и реализации; синхронный Event Bus допустим на MVP; модули используют публичные контракты без циклических зависимостей. Между PHP и Python — внутренний HTTP API, service authentication, correlation ID, timeout и idempotency key.

## Outbox и Redis
Доменное изменение и outbox-запись создаются в одной транзакции PostgreSQL. Worker публикует задачу в Redis и отмечает запись опубликованной. Повторная публикация возможна, поэтому consumers должны быть идемпотентными. Exactly-once не гарантируется; практическая модель — at-least-once с дедупликацией.

## БД и RAG
PostgreSQL с первого этапа. pgvector — кандидат для embeddings, но выбор подтверждается тестами на реальной базе знаний и контрольных вопросах.

## REST API
Публичный API имеет префикс `/api/v1`. Предварительные ресурсы: `/sessions`, `/sessions/{id}/messages`, `/sessions/{id}/turns`, `/sessions/{id}/close`, `/sessions/{id}/leads`, `/leads/{id}`. Внутренние endpoints отделяются сетевыми правилами и сервисной аутентификацией. API валидирует вход, использует единый формат ошибок, request/correlation ID и OpenAPI/Swagger.

## Frontend
React + TypeScript micro-frontend: чат, статусы, уточнения, заявка, новый диалог и debug. Общается только с backend REST API.

## Безопасность
На MVP нет аккаунтов. Анонимная сессия получает непредсказуемый credential; доступ к истории проверяется сервером. Debug не публичен в production. Контакты собираются после согласия и не попадают в обычные логи. В демонстрации — тестовые данные. Секреты не коммитятся, материалы кейса не публикуются вопреки ограничениям.

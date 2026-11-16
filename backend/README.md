# Backend

PHP 8.1 + Yii2 REST API. Архитектура: Clean Architecture, DDD, CQRS. Core содержит доменную модель и бизнес-правила; PHP-модули реализуют специализированные возможности и адаптеры.

- Core — источник истины для доменных данных.
- PHP-модули — функциональные области с публичными контрактами.
- `ai` — OpenAI-compatible gateway, не движок консультативной логики.
- Python Generation Service — отдельный процесс RAG/orchestration, вызывающий backend по внутренним контрактам.
- REST API — интерфейс frontend и внутренних сервисов.

## Базовая структура
```text
backend/
├── commands/  ├── config/
├── core/
│   ├── application/{command,dto,handler,port,query,useCase}/
│   ├── domain/{entity,enum,event,exception,valueObject}/
│   ├── infrastructure/{bootstrap,event,handler,listener,mailer,migrations,persistence,repository,storage}/
│   ├── presentation/{controller,request,swagger,view}/
│   └── security/
├── modules/{ai,lead}/
├── web/
├── docs/specification/
└── README.md
```

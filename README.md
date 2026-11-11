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

PHP 8.1 + Yii2 (Clean Architecture, DDD, CQRS); Python generation service; React + TypeScript; PostgreSQL; Redis; transactional outbox; Docker Compose; Markdown и OpenAPI/Swagger. pgvector — кандидат для векторного поиска, окончательный выбор подтверждается тестами.

## Структура

```text
.
├── backend/                 # Yii2 REST API, Core и PHP-модули
│   ├── core/
│   ├── modules/
│   └── docs/specification/
├── frontend/                # React + TypeScript micro-frontend
│   └── docs/
├── services/                # Python-сервисы, включая generation
├── infrastructure/          # Общие инфраструктурные материалы
├── docs/                    # Требования, архитектура, планы, ADR, эксплуатация
├── docker-compose.yml
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE.md
└── README.md
```

## Запуск

Требуются Docker Engine и Docker Compose plugin.

```bash
cp .env.example .env
# заполнить локальные параметры и ключ тестового AI-провайдера
docker compose up --build
```

Миграции и загрузка тестовой базы знаний выполняются командами из `backend/README.md` и README Python-сервиса. Адреса и порты должны соответствовать фактическому compose-файлу. Не коммитьте `.env` и реальные секреты.

## Документация

- [Общая документация](docs/README.md)
- [Требования хакатона](docs/requirements/HACKATHON_REQUIREMENTS.md)
- [Архитектура](docs/architecture/SYSTEM_ARCHITECTURE.md)
- [План реализации](docs/implementation/IMPLEMENTATION_PLAN.md)
- [Этапирование](docs/implementation/ROADMAP.md)
- [ADR](docs/decisions/README.md)
- [Backend](backend/README.md) · [Backend specification](backend/docs/specification/README.md)
- [Frontend](frontend/README.md) · [Frontend docs](frontend/docs/README.md)
- [Contributing](CONTRIBUTING.md) · [Code of Conduct](CODE_OF_CONDUCT.md) · [License](LICENSE.md)

Документация описывает целевое состояние и план. Она не утверждает, что весь перечисленный функционал уже реализован.

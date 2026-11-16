# Локальная разработка

## Требования
Docker Engine, Docker Compose plugin, Git и доступ к тестовому OpenAI-compatible API, если профиль запуска использует внешнюю модель.

## Подготовка
```bash
git clone <repository-url>
cd <repository>
cp .env.example .env
```
Заполните `.env` локальными значениями. Не коммитьте файл и не публикуйте секреты.

## Запуск
```bash
docker compose up --build
```
Миграции и загрузка тестовой базы знаний запускаются командами из README backend и Python-сервиса после реализации scripts.

## Проверка
1. PostgreSQL и Redis healthy.
2. Открыть frontend по адресу из Compose.
3. Отправить тестовый вопрос.
4. Проверить сохранение истории.
5. Создать новый диалог и проверить отсутствие старого контекста.
6. Пройти заявку на вымышленных данных.
7. Проверить debug-источники и timing.

## Диагностика
```bash
docker compose ps
docker compose logs -f
docker compose logs -f <service-name>
```
При сбое AI API проверьте URL, модель, ключ, сеть и лимиты. Перед передачей логов удалите секреты и контакты. Удаление Docker volumes может уничтожить локальную БД.

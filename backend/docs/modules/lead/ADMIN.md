# Администрирование модуля Lead

## Конфигурация

### ENV-переменные

Модуль `lead` в текущей версии не использует ENV-переменных напрямую. Все параметры зашиты в params.php (пока пустой — для будущих настроек).

### params.php

```php
return [
    // Для будущих настроек
];
```

## Миграции БД

### Применение миграции

```bash
# Применить все миграции модуля
php yii migrate --migrationPath=@modules/lead/infrastructure/migrations

# Или по имени класса
php yii migrate --migrationNamespaces[]=modules\lead\infrastructure\migrations
```

### Откат миграции

```bash
php yii migrate/down 1 --migrationPath=@modules/lead/infrastructure/migrations
```

### Миграция m261113_000001

Создаёт таблицу `lead`:

```sql
CREATE TABLE lead (
    id           BIGINT PRIMARY KEY AUTO_INCREMENT,
    company      VARCHAR(255) NOT NULL,
    full_name    VARCHAR(255) NOT NULL,
    phone        VARCHAR(20) NOT NULL,
    summary      TEXT NOT NULL,
    messages     JSON DEFAULT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'new',
    manager_note TEXT DEFAULT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE INDEX idx_lead_status ON lead(status);
```

## Мониторинг

### Проверка состояния

```bash
# Получить общее количество лидов
curl -X GET "https://example.com/admin/leads?limit=1"

# Ответ содержит "total": N — общее количество лидов
```

### Метрики для SRE-мониторинга

| Метрика                          | Источник                                   | Комментарий                       |
|----------------------------------|--------------------------------------------|-----------------------------------|
| Количество лидов в статусе `new` | `GET /admin/leads?status=new`              | Показывает нагрузку на менеджеров |
| Время жизни лида (lead time)     | Разница `created_at` → `updated_at`        | Эффективность обработки           |
| Количество дубликатов (попытки)  | Логи `ValidationException` по phone        | Качество данных                   |
| Ошибки валидации                 | HTTP 400 на `POST /leads`                  | Качество фронтенд-форм            |
| JSON-ошибки messages             | Логи `RuntimeException` в DbLeadRepository | Битые данные                      |

### Логирование

Модуль логирует через Yii:
- `ValidationException` — ошибки валидации входящих данных
- `EntityNotFoundException` — запрос несуществующего лида (404)
- `RuntimeException` — ошибки сохранения в БД

Категории логирования — стандартные Yii (контроллеры, приложение, БД).

## Типовые административные операции

### Ручное создание лида (для тестирования)

```bash
curl -X POST https://example.com/leads \
  -H "Content-Type: application/json" \
  -d '{
    "company": "Тестовая компания",
    "full_name": "тестовый контакт",
    "phone": "+7 000 000-00-00",
    "summary": "Тестовый лид для проверки"
  }'
```

### Массовое изменение статусов (через SQL)

```sql
-- Закрыть все лиды старше 90 дней со статусом in_progress
UPDATE lead
SET status = 'closed',
    manager_note = CONCAT(manager_note, ' | Автоматически закрыто через 90 дней'),
    updated_at = NOW()
WHERE status = 'in_progress'
  AND created_at < NOW() - INTERVAL 90 DAY;
```

### Поиск дубликатов по телефону

```sql
SELECT phone, COUNT(*) AS cnt
FROM lead
GROUP BY phone
HAVING cnt > 1;
```

### Очистка тестовых данных

```sql
-- Удалить лиды, созданные в рамках тестирования (осторожно!)
DELETE FROM lead WHERE company LIKE 'Тест%' AND created_at > '2026-11-01';
```

## Безопасность

| Мера                                   | Статус                                      |
|----------------------------------------|---------------------------------------------|
| Валидация телефона (regex)             | ✅ Реализовано                               |
| Защита от XSS (Yii Model, trim)        | ✅ Реализовано                               |
| Разделение публичного и admin API      | ✅ Реализовано (разные контроллеры)          |
| Аутентификация на /admin/leads         | ❌ Нет (требуется интеграция с auth-модулем) |
| Rate-limiting на POST /leads           | ❌ Нет                                       |
| Экранирование JSON при записи messages | ✅ (json_encode с флагами)                   |

## Troubleshooting

### "Lead not found" при запросе лида

1. Проверить, что лид существует: `SELECT * FROM lead WHERE id = :id`
2. Убедиться, что миграция применена
3. Проверить права подключения к БД

### "Phone already exists" при создании

1. Проверить существующие лиды с таким номером: `SELECT * FROM lead WHERE phone = :phone`
2. Если это ложное срабатывание — проверить нормализацию номера (пробелы, дефисы, скобки)

### "Failed to save lead" в логах

1. Проверить структуру поля `messages` — невалидный JSON может вызывать ошибку
2. Проверить длину полей (company > 255 символов)
3. Проверить размер JSON в messages (MySQL max_allowed_packet)
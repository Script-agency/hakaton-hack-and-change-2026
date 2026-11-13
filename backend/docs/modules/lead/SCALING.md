# Масштабирование модуля Lead

## Текущая архитектура

Модуль `lead` работает с одной таблицей `lead` в MySQL/MariaDB. Операции записи (CREATE, UPDATE) выполняются в транзакциях. Операции чтения (GET, LIST) — через прямой `yii\db\Query`.

## Производительность

### Текущие лимиты

| Параметр   | Значение                  | Комментарий                                        |
|------------|---------------------------|----------------------------------------------------|
| Индексы    | idx_lead_status (status)  | Только один индекс                                 |
| Пагинация  | LIMIT + OFFSET            | Стандартная, может деградировать на больших OFFSET |
| Транзакции | Одна запись за транзакцию | Нет массовых операций                              |
| JSON-поле  | messages (JSON)           | Не индексируется                                   |

### Узкие места

1. **Один индекс (status)** — фильтры по company, full_name, phone используют LIKE без индекса, что при > 100K записей приведёт к full scan
2. **OFFSET-пагинация** — на больших страницах (> 100K) `OFFSET 100000 LIMIT 20` будет сканировать всю таблицу
3. **JSON-поле messages** — не может быть эффективно проиндексировано; при хранении больших диалогов увеличивает размер строки и замедляет сканирование
4. **Отсутствие кэширования** — повторные запросы списка (особенно с фильтрацией) выполняются каждый раз заново
5. **Нет репликации read/write** — все запросы идут на один сервер БД

## Стратегии масштабирования

### 1. Добавление индексов (первоочередная мера)

Для поддержки фильтрации на объёмах до 1 млн записей:

```sql
-- Составной индекс для фильтра по статусу + дате
CREATE INDEX idx_lead_status_created ON lead(status, created_at);

-- Индекс для поиска по телефону (точное совпадение)
CREATE UNIQUE INDEX idx_lead_phone ON lead(phone);

-- Полнотекстовый индекс для поиска по компании и ФИО
ALTER TABLE lead ADD FULLTEXT INDEX ft_lead_name (company, full_name);
```

После добавления полнотекстового индекса изменить LIKE-фильтры в `DbLeadRepository::buildFilterQuery()` на `MATCH ... AGAINST`.

### 2. Cursor-based пагинация (для больших объёмов)

Вместо `LIMIT x OFFSET y` использовать `WHERE id > :lastSeenId LIMIT 20`:

```php
public function findWithFiltersCursor(LeadFiltersDto $filters, ?int $cursor): array
{
    $query = $this->buildFilterQuery($filters);
    if ($cursor !== null) {
        $query->andWhere(['>', 'id', $cursor]);
    }
    $query->limit($filters->limit)->orderBy(['id' => SORT_ASC]);
    return array_map([$this, 'hydrate'], $query->all());
}
```

**Плюсы:** константная скорость на любой глубине.
**Минусы:** нет прямого перехода на страницу номер N, сложнее реализовать total count.

### 3. Кэширование списков

Использовать Yii Cache (APCu, Redis, Memcached):

```php
public function findWithFilters(LeadFiltersDto $filters): array
{
    $cacheKey = 'leads:' . md5(serialize($filters));
    return Yii::$app->cache->getOrSet($cacheKey, function () use ($filters) {
        // ... original query ...
    }, 60); // TTL 60 сек
}
```

**Важно:** инвалидировать кэш при `save()` — сбрасывать ключи `leads:*`.

### 4. Read Replicas

Настроить Yii DB с slave-серверами для запросов GET/LIST. Команды CREATE/UPDATE направлять на master:

```php
'components' => [
    'db' => [
        'class' => 'yii\db\Connection',
        'dsn' => 'mysql:host=master_host;dbname=...',
    ],
    'dbSlave' => [
        'class' => 'yii\db\Connection',
        'dsn' => 'mysql:host=slave_host;dbname=...',
    ],
],
```

В `DbLeadRepository` использовать slave для `findWithFilters()` / `findById()`.

### 5. Партиционирование таблицы (для > 10M записей)

При достижении 10+ миллионов записей — партиционирование по `created_at` (по месяцам):

```sql
ALTER TABLE lead PARTITION BY RANGE (TO_DAYS(created_at)) (
    PARTITION p2025_01 VALUES LESS THAN (TO_DAYS('2025-02-01')),
    PARTITION p2025_02 VALUES LESS THAN (TO_DAYS('2025-03-01')),
    ...
);
```

### 6. Архивация старых лидов

Для лидов со статусом `closed` или `cancelled` старше N месяцев — выгрузка в архивную таблицу `lead_archive` с последующим удалением из основной.

## План масштабирования по этапам

| Этап        | Объём записей | Действия                                                               |
|-------------|---------------|------------------------------------------------------------------------|
| 0 (текущий) | < 50K         | Без изменений                                                          |
| 1           | 50K – 500K    | Добавить индексы (idx_lead_phone, ft_lead_name, idx_status_created)    |
| 2           | 500K – 5M     | Включить кэширование списков, перейти на курсорную пагинацию           |
| 3           | 5M – 50M      | Read replicas, партиционирование, архивация                            |
| 4           | > 50M         | Переход на выделенную поисковую систему (Elasticsearch) для фильтрации |
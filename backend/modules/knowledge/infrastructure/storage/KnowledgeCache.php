<?php

declare(strict_types=1);

namespace modules\knowledge\infrastructure\storage;

use Redis;
use RedisException;
use Throwable;
use Yii;

/** Redis is an optional accelerator. Файлы знаний остаются доступными для чтения, когда Redis не работает. */
final class KnowledgeCache
{
    private ?Redis $client = null;
    private bool $connectionAttempted = false;

    public function __construct(
        private readonly int $ttl = 3600,
        private readonly int $maxEntryBytes = 262144,
    ) {
    }

    public function maxEntryBytes(): int
    {
        return $this->maxEntryBytes;
    }

    public function get(string $key): ?string
    {
        try {
            $client = $this->client();
            if ($client === null) {
                return null;
            }
            $value = $client->get($key);
            return is_string($value) ? $value : null;
        } catch (Throwable $e) {
            Yii::warning('Knowledge Redis cache read failed: ' . $e->getMessage(), 'knowledge');
            return null;
        }
    }

    public function set(string $key, string $value): void
    {
        if (strlen($value) > $this->maxEntryBytes) {
            return;
        }
        try {
            $client = $this->client();
            $client?->setex($key, $this->ttl, $value);
        } catch (Throwable $e) {
            Yii::warning('Knowledge Redis cache write failed: ' . $e->getMessage(), 'knowledge');
        }
    }

    public function delete(string $key): void
    {
        try {
            $client = $this->client();
            $client?->del($key);
        } catch (Throwable $e) {
            Yii::warning('Knowledge Redis cache invalidation failed: ' . $e->getMessage(), 'knowledge');
        }
    }

    /**
     * @throws RedisException
     */
    private function client(): ?Redis
    {
        if ($this->client !== null) {
            return $this->client;
        }
        if ($this->connectionAttempted) {
            return null;
        }
        $this->connectionAttempted = true;

        if (!class_exists(Redis::class)) {
            Yii::warning('PHP Redis extension is not installed; knowledge cache is disabled.', 'knowledge');
            return null;
        }

        $redis = new Redis();
        $connected = $redis->connect(
            (string)($_ENV['REDIS_HOST'] ?? 'redis'),
            (int)($_ENV['REDIS_PORT'] ?? 6379),
            1.0,
        );
        if (!$connected) {
            return null;
        }
        $password = (string)($_ENV['REDIS_PASSWORD'] ?? '');
        if ($password !== '' && !$redis->auth($password)) {
            return null;
        }
        $this->client = $redis;
        return $this->client;
    }
}

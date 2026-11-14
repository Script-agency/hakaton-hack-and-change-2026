<?php

declare(strict_types=1);

use modules\knowledge\application\service\KnowledgeService;
use modules\knowledge\infrastructure\storage\KnowledgeCache;
use modules\knowledge\infrastructure\storage\LocalFileStorage;
use yii\di\Container;

/** @var Container $container */
$container->setSingleton(LocalFileStorage::class);
$container->setSingleton(KnowledgeCache::class, function () {
    return new KnowledgeCache(
        (int)($_ENV['KNOWLEDGE_REDIS_TTL'] ?? 3600),
        (int)($_ENV['KNOWLEDGE_MAX_INLINE_PART_BYTES'] ?? 262144),
    );
});
$container->setSingleton(KnowledgeService::class);

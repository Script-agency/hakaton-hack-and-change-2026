<?php

declare(strict_types=1);

use core\application\port\IEventDispatcher;
use core\application\port\ITransactionManager;
use core\infrastructure\event\GlobalEventDispatcher;
use core\infrastructure\repository\DbTransactionManager;

$container = Yii::$container;

// ---------- Репозитории ----------

$container->setSingleton(ITransactionManager::class, function () {
    return new DbTransactionManager();
});

// ---------- Redis ----------
$container->set(Redis::class, function () {
    $redis = new Redis();
    $redis->connect($_ENV['REDIS_HOST'], (int)$_ENV['REDIS_PORT']);
    if (!empty($_ENV['REDIS_PASSWORD'])) {
        $redis->auth($_ENV['REDIS_PASSWORD']);
    }
    return $redis;
});

// ---------- Events ----------

$container->setSingleton(IEventDispatcher::class, function ($container) {
    return new GlobalEventDispatcher($container, []);
});

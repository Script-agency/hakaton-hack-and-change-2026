<?php

declare(strict_types=1);

use modules\ai\application\service\AiService;
use modules\ai\infrastructure\AiClient;
use modules\ai\infrastructure\AiCookieStorage;
use yii\httpclient\Client;

$container = Yii::$container;

$container->setSingleton(AiCookieStorage::class);
$container->set(AiClient::class, function () {
    $httpClient = new Client([
        'transport' => 'yii\httpclient\CurlTransport',
    ]);
    return new AiClient(
        $httpClient,
        (int)($_ENV['AI_HTTP_TIMEOUT'] ?? 300),
        (int)($_ENV['AI_CONNECT_TIMEOUT'] ?? 15),
        (int)($_ENV['AI_MAX_RETRIES'] ?? 2),
    );
});
$container->setSingleton(AiService::class);

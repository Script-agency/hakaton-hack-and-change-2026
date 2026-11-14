<?php

declare(strict_types=1);

use modules\ai\application\dto\AiSettingsDto;
use modules\ai\application\service\AiService;
use modules\ai\infrastructure\AiClient;
use modules\ai\infrastructure\AiSettingStorage;
use yii\httpclient\Client;

$container = Yii::$container;

$container->setSingleton(AiSettingStorage::class, function () {
    return new AiSettingStorage(
        new AiSettingsDto(
            baseUrl: $_ENV['AI_BASE_URL'],
            apiKey:  $_ENV['AI_API_KEY'],
            model:   $_ENV['AI_MODEL'],
        ),
    );
});
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

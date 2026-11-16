<?php

declare(strict_types=1);

use modules\generation\application\service\GenerationChatService;
use yii\httpclient\Client;
use yii\httpclient\CurlTransport;

$container = Yii::$container;
$container->setSingleton(Client::class, function () {
    return new Client(['transport' => CurlTransport::class]);
});
$container->setSingleton(GenerationChatService::class);
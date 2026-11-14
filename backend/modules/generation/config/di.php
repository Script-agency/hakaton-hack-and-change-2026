<?php

declare(strict_types=1);

use yii\httpclient\Client;
use yii\httpclient\CurlTransport;

$container = Yii::$container;
$container->setSingleton(Client::class, function () {
    return new Client(['transport' => CurlTransport::class]);
});

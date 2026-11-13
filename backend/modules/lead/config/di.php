<?php

declare(strict_types=1);

use modules\lead\application\handler\CreateLeadHandler;
use modules\lead\application\handler\GetLeadHandler;
use modules\lead\application\handler\ListLeadHandler;
use modules\lead\application\handler\UpdateLeadStatusHandler;
use modules\lead\domain\repository\ILeadRepository;
use modules\lead\infrastructure\repository\DbLeadRepository;
use yii\di\Container;

$params = require __DIR__ . '/params.php';

/** @var Container $container */
$container->setSingleton(
    ILeadRepository::class,
    static fn () => new DbLeadRepository(),
);

$container->setSingleton(CreateLeadHandler::class);
$container->setSingleton(UpdateLeadStatusHandler::class);
$container->setSingleton(GetLeadHandler::class);
$container->setSingleton(ListLeadHandler::class);

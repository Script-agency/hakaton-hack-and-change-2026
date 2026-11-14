<?php

declare(strict_types=1);

/**
 * @example
 * 'module-name'=>[
 *      'class' =>'modules\module-name\Module',
 *      'controllerNamespace' => 'modules\module-name\presentation\controller',
 * ],
 */
return [
    'ai' => [
        'class' => 'modules\\ai\\Module',
        'controllerNamespace' => 'modules\\ai\\presentation\\controller',
    ],
    'lead' => [
        'class' => 'modules\\lead\\Module',
        'controllerNamespace' => 'modules\\lead\\presentation\\controller',
    ],
    'knowledge' => [
        'class' => 'modules\\knowledge\\Module',
        'controllerNamespace' => 'modules\\knowledge\\presentation\\controller',
    ],
    'generation' => [
        'class' => 'modules\\generation\\Module',
        'controllerNamespace' => 'modules\\generation\\presentation\\controller',
    ],
];

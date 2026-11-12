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
        'class' => 'modules\ai\Module',
        'controllerNamespace' => 'modules\ai\presentation\controller',
    ],
];

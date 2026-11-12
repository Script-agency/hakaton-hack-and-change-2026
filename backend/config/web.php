<?php

declare(strict_types=1);

use core\security\YiiIdentity;
use modules\passport\auth\presentation\middleware\PassportAuthMiddleware;
use modules\rbac\presentation\middleware\RbacMiddleware;
use yii\symfonymailer\Mailer;
use yii\web\Response;

$params         = require __DIR__ . '/params.php';
$db             = require __DIR__ . '/db.php';
$modules        = require __DIR__ . '/modules.php';
$container      = __DIR__ . '/container.php';
$diConfigs          = [
    __DIR__ . '/../modules/ai/config/di.php',
];

$config = [
    'id' => $_ENV['APP_NAME'],
    'basePath' => dirname(__DIR__),
    'controllerNamespace' => 'core\presentation\controller',
    'bootstrap' => [
        [
            'class'  => 'core\infrastructure\bootstrap\ResponseFormatBootstrap',
            'routes' => [
                ''      => Response::FORMAT_HTML,
                'api'   => Response::FORMAT_JSON,
            ],
        ],
        'core\infrastructure\bootstrap\ErrorHandlerBootstrap',
        'log',
    ],
    'aliases' => [
        '@bower'    => '@vendor/bower-asset',
        '@npm'      => '@vendor/npm-asset',
        '@core'     => dirname(__DIR__) . '/core',
        '@modules'  => dirname(__DIR__) . '/modules',
    ],
    'on beforeRequest' => static function (): void {
        Yii::$container->get(PassportAuthMiddleware::class)->handle();
        Yii::$container->get(RbacMiddleware::class)->handle();
    },
    'modules' => $modules,
    'components' => [
        'request' => [
            'cookieValidationKey' => $_ENV['COOKIE_VALIDATION_KEY'],
            'parsers' => [
                'application/json' => 'yii\web\JsonParser',
                'multipart/form-data' => 'yii\web\MultipartFormDataParser',
            ],
        ],
        'response' => [
            'format'    => yii\web\Response::FORMAT_JSON,
            'charset'   => 'UTF-8',
        ],
        'cache' => [
            'class' => 'yii\caching\FileCache',
        ],
        'user' => [
            'identityClass'     => YiiIdentity::class,
            'enableAutoLogin'   => false,
            'enableSession'     => false,
        ],
        'errorHandler' => [
            'class' => 'core\infrastructure\handler\JsonErrorHandler',
        ],
        'log' => [
            'traceLevel' => YII_DEBUG ? 1 : 0,
            'targets' => [
                [
                    'class'     => 'yii\log\FileTarget',
                    'levels'    => ['error', 'warning'],
                    'logVars'   => [],
                    'except' => [
                        'yii\web\HttpException:404',
                    ],
                ],
            ],
        ],
        'db' => $db,
        'urlManager' => [
            'enablePrettyUrl'   => true,
            'showScriptName'    => false,
            'rules' =>  array_merge(
                require __DIR__ . '/../modules/ai/config/routing.php',
                [
                    // Swagger documentation
                    'docs/swagger/json'             => 'swagger/json',
                    'docs/swagger'                  => 'swagger/ui',

                    // Project documentation
                    'docs'                          => 'docs/ui',
                    'docs/<page:.*>'                => 'docs/ui',

                    // Дефолтный маршрут для OPTIONS (CORS)
                    'OPTIONS <any:.*>'              => 'site/options',
                ],
            ),
        ],
    ],
    'params' => $params,
];

require $container;

foreach ($diConfigs as $diConfig) {
    if (file_exists($diConfig)) {
        require $diConfig;
    }
}

if (YII_ENV_DEV) {
    $config['bootstrap'][] = 'debug';
    $config['modules']['debug'] = [
        'class' => 'yii\debug\Module',
    ];

    $config['bootstrap'][] = 'gii';
    $config['modules']['gii'] = [
        'class' => 'yii\gii\Module',
    ];
}

return $config;

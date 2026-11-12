<?php

declare(strict_types=1);

namespace core\infrastructure\bootstrap;

use Yii;
use yii\base\BootstrapInterface;
use yii\base\InvalidConfigException;
use yii\web\Application;
use yii\web\Response;
use core\infrastructure\handler\JsonErrorHandler;

class ErrorHandlerBootstrap implements BootstrapInterface
{
    /**
     * Префикс URL, для которого используется JsonErrorHandler.
     * @var string
     */
    public string $apiPrefix = 'api';

    /**
     * Конфиг errorHandler по умолчанию (HTML).
     * @var array
     */
    public array $htmlConfig = [
        'class'     => 'yii\web\ErrorHandler',
        'errorView' => '@modules/web/presentation/view/system/error.php',
    ];

    /**
     * Конфиг errorHandler для API.
     * @var array
     */
    public array $apiConfig = [
        'class' => JsonErrorHandler::class,
    ];

    /**
     * @throws InvalidConfigException
     */
    public function bootstrap($app): void
    {
        if (!$app instanceof Application) {
            return;
        }

        $path  = trim($app->request->getPathInfo(), '/');
        $isApi = $path === $this->apiPrefix
            || str_starts_with($path, $this->apiPrefix . '/');

        if ($isApi) {
            $app->set('errorHandler', $this->apiConfig);
            $app->response->format = Response::FORMAT_JSON;
        } else {
            $app->set('errorHandler', $this->htmlConfig);
            $app->response->format = Response::FORMAT_HTML;
        }

        // перерегистрируем PHP-обработчики на новый инстанс
        $app->getErrorHandler()->register();
    }
}

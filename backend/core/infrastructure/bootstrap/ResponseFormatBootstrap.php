<?php

declare(strict_types=1);

namespace core\infrastructure\bootstrap;

use yii\base\BootstrapInterface;
use yii\base\InvalidConfigException;
use yii\web\Response;

class ResponseFormatBootstrap implements BootstrapInterface
{
    /**
     * Карта: префикс URL => формат ответа.
     * Порядок важен: первое совпадение выигрывает.
     * Пустая строка '' — это fallback (совпадёт всегда).
     *
     * @var array<string,string>
     */
    public array $routes = [];

    /**
     * @throws InvalidConfigException
     */
    public function bootstrap($app): void
    {
        if ($app->request->isConsoleRequest) {
            return;
        }

        $path = trim($app->request->getPathInfo(), '/');

        foreach ($this->routes as $prefix => $format) {
            // '' — fallback, матчит всё
            if ($prefix === '' || $path === rtrim($prefix, '/')
                || str_starts_with($path, rtrim($prefix, '/') . '/')) {
                $app->response->format = $format;
                return;
            }
        }
    }
}

<?php

declare(strict_types=1);

/**
 * Базовые настройки AI-модуля.
 *
 * Значения берутся из переменных окружения и могут быть переопределены
 * пользователем через cookie (см. AiCookieStorage).
 */
return [
    'ai' => [
        'baseUrl' => $_ENV['AI_BASE_URL'] ?? '',
        'apiKey'  => $_ENV['AI_API_KEY'] ?? '',
        'model'   => $_ENV['AI_MODEL'] ?? '',
    ],
];

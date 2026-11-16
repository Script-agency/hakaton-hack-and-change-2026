<?php

declare(strict_types=1);

namespace modules\ai\application\dto;

class AiSettingsDto
{
    public function __construct(
        public readonly string $baseUrl,
        public readonly string $apiKey,
        public readonly string $model,
    ) {
    }

    /**
     * Проверяет, заполнены ли все обязательные поля.
     */
    public function isComplete(): bool
    {
        return $this->baseUrl !== '' && $this->apiKey !== '' && $this->model !== '';
    }
}

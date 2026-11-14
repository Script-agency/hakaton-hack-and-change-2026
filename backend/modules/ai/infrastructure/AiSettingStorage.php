<?php

declare(strict_types=1);

namespace modules\ai\infrastructure;

use modules\ai\application\dto\AiSettingsDto;
use Yii;
use yii\web\Cookie;

class AiSettingStorage
{
    public function __construct(
        private readonly AiSettingsDto $baseSettings,
    ) {
    }

    /**
     * Проверяет, заполнены ли все обязательные настройки AI.
     * Сначала проверяет cookie, если не все — падает на baseSettings из env/params.
     */
    public function hasSettings(): bool
    {
        return $this->baseSettings->isComplete();
    }

    /**
     * Возвращает объединённые настройки: значения из cookie переопределяют baseSettings.
     */
    public function getSettings(): AiSettingsDto
    {
        return new AiSettingsDto(
            baseUrl: $this->baseSettings->baseUrl,
            apiKey:  $this->baseSettings->apiKey,
            model:   $this->baseSettings->model,
        );
    }
}

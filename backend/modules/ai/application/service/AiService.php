<?php

declare(strict_types=1);

namespace modules\ai\application\service;

use Exception;
use modules\ai\application\dto\AiRequestDto;
use modules\ai\application\dto\AiResponseDto;
use modules\ai\application\dto\AiSettingsDto;
use modules\ai\domain\exception\AiInvalidResponseException;
use modules\ai\domain\exception\AiRateLimitException;
use modules\ai\domain\exception\AiTimeoutException;
use modules\ai\domain\exception\AiTransportException;
use modules\ai\infrastructure\AiClient;
use modules\ai\infrastructure\AiCookieStorage;

class AiService
{
    public function __construct(
        private readonly AiCookieStorage $cookieStorage,
        private readonly AiClient $client,
    ) {
    }

    /**
     * Сохраняет настройки AI в cookie.
     */
    public function saveSettings(string $baseUrl, string $apiKey, string $model): void
    {
        $settings = new AiSettingsDto($baseUrl, $apiKey, $model);
        $this->cookieStorage->saveSettings($settings);
    }

    /**
     * Проверяет, установлены ли настройки AI.
     */
    public function getSettings(): AiSettingsDto
    {
        return $this->cookieStorage->getSettings();
    }

    public function hasSettings(): bool
    {
        return $this->cookieStorage->hasSettings();
    }

    /**
     * Возвращает публичную информацию о настройках (без ключа).
     *
     * @return array{hasSettings: bool, model: string|null}
     */
    public function getSettingsInfo(): array
    {
        return [
            'hasSettings' => $this->cookieStorage->hasSettings(),
            'model'       => $this->cookieStorage->getModelName(),
        ];
    }

    /**
     * Отправляет chat-запрос к нейросети через прокси.
     *
     * @param string $systemPrompt Системная инструкция
     * @param array $messages Сообщения пользователя/ассистента
     * @return AiResponseDto
     *
     * @throws AiTransportException
     * @throws AiTimeoutException
     * @throws AiRateLimitException
     * @throws AiInvalidResponseException
     * @throws Exception
     */
    /** @param array<int, array<string, mixed>> $messages */
    public function chat(string $systemPrompt, array $messages): AiResponseDto
    {
        return $this->chatWithSettings(
            $this->cookieStorage->getSettings(),
            $systemPrompt,
            $messages,
        );
    }

    /** @param array<int, array<string, mixed>> $messages */
    public function chatWithSettings(
        AiSettingsDto $settings,
        string $systemPrompt,
        array $messages,
    ): AiResponseDto {
        if (!$settings->isComplete()) {
            throw new \RuntimeException('AI settings are incomplete.');
        }

        return $this->client->chat(
            $settings,
            new AiRequestDto(
                systemPrompt: $systemPrompt,
                messages: $messages,
            ),
        );
    }

}

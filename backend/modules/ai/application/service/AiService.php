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
use modules\ai\infrastructure\persistence\AiAuditLogAR;

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
     * @return array{hasSettings: bool, model: string|null, baseUrl: string|null}
     */
    public function getSettingsInfo(): array
    {
        $settings = $this->cookieStorage->getSettings();

        return [
            'hasSettings' => $this->cookieStorage->hasSettings(),
            'model'       => $settings->model !== '' ? $settings->model : null,
            'baseUrl'     => $settings->baseUrl !== '' ? $settings->baseUrl : null,
        ];
    }

    /**
     * Отправляет chat-запрос к нейросети через прокси с аудит-логированием.
     *
     * @param string $systemPrompt Системная инструкция
     * @param array $messages Сообщения пользователя/ассистента
     * @param string|null $modelOverride Опциональное переопределение модели для этого запроса
     * @return AiResponseDto
     *
     * @throws AiTransportException
     * @throws AiTimeoutException
     * @throws AiRateLimitException
     * @throws AiInvalidResponseException
     * @throws Exception
     */
    /** @param array<int, array<string, mixed>> $messages */
    public function chat(string $systemPrompt, array $messages, ?string $modelOverride = null): AiResponseDto
    {
        $settings = $this->cookieStorage->getSettings();

        if ($modelOverride !== null) {
            $settings = new AiSettingsDto(
                baseUrl: $settings->baseUrl,
                apiKey: $settings->apiKey,
                model: $modelOverride,
            );
        }

        return $this->chatWithSettings(
            $settings,
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
            $this->logAudit(
                model: $settings->model,
                wasSentToAi: false,
                hasError: true,
                errorMessage: 'AI settings are incomplete.',
            );
            throw new \RuntimeException('AI settings are incomplete.');
        }

        $model    = $settings->model;
        $response = null;

        try {
            $response = $this->client->chat(
                $settings,
                new AiRequestDto(
                    systemPrompt: $systemPrompt,
                    messages: $messages,
                ),
            );
        } catch (AiRateLimitException $e) {
            $this->logAudit(
                model: $model,
                wasSentToAi: true,
                hasError: true,
                errorMessage: 'Rate limit exceeded: ' . $e->getMessage(),
            );
            throw $e;
        } catch (AiTimeoutException $e) {
            $this->logAudit(
                model: $model,
                wasSentToAi: true,
                hasError: true,
                errorMessage: 'Request timed out: ' . $e->getMessage(),
            );
            throw $e;
        } catch (AiInvalidResponseException $e) {
            $this->logAudit(
                model: $model,
                wasSentToAi: true,
                hasError: true,
                errorMessage: 'Invalid AI response: ' . $e->getMessage(),
            );
            throw $e;
        } catch (AiTransportException $e) {
            $this->logAudit(
                model: $model,
                wasSentToAi: true,
                hasError: true,
                errorMessage: 'Transport error: ' . $e->getMessage(),
            );
            throw $e;
        } catch (Throwable $e) {
            $this->logAudit(
                model: $model,
                wasSentToAi: false,
                hasError: true,
                errorMessage: 'Unexpected error: ' . $e->getMessage(),
            );
            throw $e;
        }

        // Успешный вызов
        $usageInfo = $response->usage;
        $this->logAudit(
            model: $model,
            wasSentToAi: true,
            hasError: false,
            promptTokens: $usageInfo !== null ? (int)($usageInfo['prompt_tokens'] ?? 0) : null,
            completionTokens: $usageInfo !== null ? (int)($usageInfo['completion_tokens'] ?? 0) : null,
            totalTokens: $usageInfo !== null ? (int)($usageInfo['total_tokens'] ?? 0) : null,
        );

        return $response;
    }

    /**
     * Записывает запись аудита AI-вызова в БД.
     */
    private function logAudit(
        string $model,
        bool $wasSentToAi,
        bool $hasError,
        ?int $promptTokens = null,
        ?int $completionTokens = null,
        ?int $totalTokens = null,
        ?string $errorMessage = null,
    ): void
    {
        try {
            $ar = new AiAuditLogAR();
            $ar->has_error         = $hasError;
            $ar->was_sent_to_ai    = $wasSentToAi;
            $ar->model             = $model !== '' ? $model : null;
            $ar->prompt_tokens     = $promptTokens;
            $ar->completion_tokens = $completionTokens;
            $ar->total_tokens      = $totalTokens;
            $ar->error_message     = $errorMessage;
            $ar->save();
        } catch (Throwable $e) {
            // Ошибка аудита не должна ломать основной функционал
            Yii::error('Failed to save AI audit log: ' . $e->getMessage(), 'ai.audit');
        }
    }
}
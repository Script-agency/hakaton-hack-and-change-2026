<?php

declare(strict_types=1);

namespace modules\ai\infrastructure;

use Exception;
use JsonException;
use modules\ai\application\dto\AiRequestDto;
use modules\ai\application\dto\AiResponseDto;
use modules\ai\application\dto\AiSettingsDto;
use modules\ai\domain\exception\AiInvalidResponseException;
use modules\ai\domain\exception\AiRateLimitException;
use modules\ai\domain\exception\AiTimeoutException;
use modules\ai\domain\exception\AiTransportException;
use yii\base\InvalidConfigException;
use yii\httpclient\Exception as HttpClientException;
use yii\httpclient\Client;
use yii\httpclient\Request;
use yii\httpclient\Response;

class AiClient
{

    private int $timeout;
    private int $connectTimeout;
    private int $maxRetries;

    public function __construct(
        private readonly Client $client,
        int $timeout,
        int $connectTimeout,
        int $maxRetries,
    ) {
        $this->timeout = $timeout;
        $this->connectTimeout = $connectTimeout;
        $this->maxRetries = $maxRetries;
    }

    /**
     * Отправляет запрос к OpenAI-совместимому API.
     *
     * @throws AiTransportException
     * @throws AiTimeoutException
     * @throws AiRateLimitException
     * @throws AiInvalidResponseException
     * @throws Exception
     */
    public function chat(AiSettingsDto $settings, AiRequestDto $request): AiResponseDto
    {
        $url = rtrim($settings->baseUrl, '/') . '/chat/completions';
        $model = $request->modelOverride ?? $settings->model;

        $messages = [];

        if ($request->systemPrompt !== '') {
            $messages[] = [
                'role'    => 'system',
                'content' => $request->systemPrompt,
            ];
        }

        foreach ($request->messages as $msg) {
            $messages[] = $msg;
        }

        $payload = [
            'model'    => $model,
            'messages' => $messages,
        ];

        $lastError = null;

        for ($attempt = 0; $attempt <= $this->maxRetries; $attempt++) {
            try {
                $raw = $this->sendRequest($url, $settings->apiKey, $payload);
                return $this->parseResponse($raw);
            } catch (AiRateLimitException $e) {
                $lastError = $e;
                // При rate-limit делаем паузу и ретраим
                if ($attempt < $this->maxRetries) {
                    usleep(1_000_000 * ($attempt + 1)); // 1s, 2s
                }
            }
        }

        throw $lastError ?? new AiTransportException('All retry attempts exhausted');
    }

    /**
     * @throws AiTimeoutException
     * @throws AiRateLimitException
     * @throws AiTransportException
     * @throws AiInvalidResponseException
     * @throws InvalidConfigException
     * @throws HttpClientException
     */
    /** @param array<string, mixed> $payload */
    private function sendRequest(string $url, string $apiKey, array $payload): array
    {
        $request = $this->client->createRequest()
            ->setMethod('POST')
            ->setUrl($url)
            ->setFormat(Client::FORMAT_JSON)
            ->setData($payload)
            ->setHeaders([
                'Content-Type'  => 'application/json',
                'Authorization' => 'Bearer ' . $apiKey,
            ])
            ->setOptions([
                'timeout'        => $this->timeout,
                'connectTimeout' => $this->connectTimeout,
            ]);

        $this->configureJsonEncoding($request);

        try {
            $response = $request->send();
        } catch (HttpClientException $e) {
            $message = $e->getMessage();
            // Yii httpclient бросает yii\httpclient\Exception с текстом cURL-ошибки
            if (stripos($message, 'timed out') !== false
                || stripos($message, 'Operation timed out') !== false
                || stripos($message, 'Connection timed out') !== false
            ) {
                throw new AiTimeoutException('Request timed out: ' . $message, (int) $e->getCode(), $e);
            }

            throw new AiTransportException('HTTP transport error: ' . $message, (int) $e->getCode(), $e);
        }

        $httpCode = (int) $response->getStatusCode();

        if ($httpCode === 429) {
            throw new AiRateLimitException('Rate limit exceeded (HTTP 429)');
        }

        if ($httpCode >= 500) {
            throw new AiTransportException("Server error (HTTP $httpCode)", $httpCode);
        }

        $decoded = $this->decodeBody($response);

        if ($httpCode >= 400) {
            $errorMsg = $decoded['error']['message'] ?? "HTTP error $httpCode";
            throw new AiTransportException($errorMsg, $httpCode);
        }

        return $decoded;
    }

    /**
     * Yii Client::FORMAT_JSON кодирует payload стандартным json_encode без нужных флагов,
     * поэтому принудительно кодируем сами.
     */
    private function configureJsonEncoding(Request $request): void
    {
        $request->setFormat(Client::FORMAT_JSON);

        $data = $request->getData();
        try {
            $encoded = json_encode(
                $data,
                JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR,
            );
        } catch (JsonException $e) {
            throw new AiTransportException('Failed to encode payload: ' . $e->getMessage(), 0, $e);
        }

        $request->setContent($encoded);
    }

    /**
     * @throws AiInvalidResponseException
     * @throws HttpClientException
     */
    private function decodeBody(Response $response): array
    {
        $body = $response->getContent();

        try {
            $decoded = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $e) {
            throw new AiInvalidResponseException(
                'Response is not valid JSON: ' . $e->getMessage(),
                (int) $response->getStatusCode(),
                $e,
            );
        }

        if (!is_array($decoded)) {
            throw new AiInvalidResponseException(
                'Response is not valid JSON structure',
                (int) $response->getStatusCode(),
            );
        }

        return $decoded;
    }

    /**
     * @param array<string, mixed> $raw
     * @return AiResponseDto
     * @throws AiInvalidResponseException
     */
    private function parseResponse(array $raw): AiResponseDto
    {
        $choice = $raw['choices'][0] ?? null;

        if (!is_array($choice)) {
            throw new AiInvalidResponseException('Response missing choices[0]');
        }

        $content = $choice['message']['content'] ?? null;

        if ($content === null || $content === '') {
            throw new AiInvalidResponseException('Response missing message content');
        }

        $finishReason = $choice['finish_reason'] ?? 'stop';

        $usage = null;
        if (isset($raw['usage']) && is_array($raw['usage'])) {
            $usage = [
                'prompt_tokens'     => (int)($raw['usage']['prompt_tokens'] ?? 0),
                'completion_tokens' => (int)($raw['usage']['completion_tokens'] ?? 0),
                'total_tokens'      => (int)($raw['usage']['total_tokens'] ?? 0),
            ];
        }

        return new AiResponseDto(
            content: $content,
            finishReason: $finishReason,
            usage: $usage,
        );
    }
}

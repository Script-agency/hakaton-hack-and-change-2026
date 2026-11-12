<?php

declare(strict_types=1);

namespace modules\ai\infrastructure;

use modules\ai\application\dto\AiSettingsDto;
use Yii;
use yii\web\Cookie;

class AiCookieStorage
{
    private const COOKIE_BASE_URL = 'ai_base_url';
    private const COOKIE_API_KEY  = 'ai_api_key';
    private const COOKIE_MODEL    = 'ai_model';

    /**
     * Проверяет, установлены ли все настройки AI в cookie.
     */
    public function hasSettings(): bool
    {
        $request = Yii::$app->request;
        $baseUrl = $request->cookies->getValue(self::COOKIE_BASE_URL, '');
        $apiKey  = $request->cookies->getValue(self::COOKIE_API_KEY, '');
        $model   = $request->cookies->getValue(self::COOKIE_MODEL, '');

        return $baseUrl !== '' && $apiKey !== '' && $model !== '';
    }

    /**
     * Возвращает DTO с настройками из cookie.
     */
    public function getSettings(): AiSettingsDto
    {
        $request = Yii::$app->request;

        return new AiSettingsDto(
            baseUrl: $request->cookies->getValue(self::COOKIE_BASE_URL, ''),
            apiKey:  $request->cookies->getValue(self::COOKIE_API_KEY, ''),
            model:   $request->cookies->getValue(self::COOKIE_MODEL, ''),
        );
    }

    /**
     * Сохраняет настройки AI в httponly cookie.
     */
    public function saveSettings(AiSettingsDto $settings, int $ttl = 2592000): void
    {
        $response = Yii::$app->response;

        $response->cookies->add(new Cookie([
            'name'     => self::COOKIE_BASE_URL,
            'value'    => $settings->baseUrl,
            'expire'   => time() + $ttl,
            'httpOnly' => true,
            'secure'   => true,
            'sameSite' => Cookie::SAME_SITE_LAX,
        ]));

        $response->cookies->add(new Cookie([
            'name'     => self::COOKIE_API_KEY,
            'value'    => $settings->apiKey,
            'expire'   => time() + $ttl,
            'httpOnly' => true,
            'secure'   => true,
            'sameSite' => Cookie::SAME_SITE_LAX,
        ]));

        $response->cookies->add(new Cookie([
            'name'     => self::COOKIE_MODEL,
            'value'    => $settings->model,
            'expire'   => time() + $ttl,
            'httpOnly' => true,
            'secure'   => true,
            'sameSite' => Cookie::SAME_SITE_LAX,
        ]));
    }

    /**
     * Возвращает название модели из cookie (без API-ключа).
     */
    public function getModelName(): ?string
    {
        $value = Yii::$app->request->cookies->getValue(self::COOKIE_MODEL);
        return $value !== null && $value !== '' ? $value : null;
    }
}

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
        $cookieSettings = $this->getCookieSettings();
        if ($cookieSettings->isComplete()) {
            return true;
        }
        return $this->baseSettings->isComplete();
    }

    /**
     * Возвращает объединённые настройки: значения из cookie переопределяют baseSettings.
     */
    public function getSettings(): AiSettingsDto
    {
        $cookie = $this->getCookieSettings();

        return new AiSettingsDto(
            baseUrl: $cookie->baseUrl !== '' ? $cookie->baseUrl : $this->baseSettings->baseUrl,
            apiKey:  $cookie->apiKey !== ''  ? $cookie->apiKey  : $this->baseSettings->apiKey,
            model:   $cookie->model !== ''   ? $cookie->model   : $this->baseSettings->model,
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
     * Возвращает название модели из объединённых настроек (cookie приоритетнее).
     */
    public function getModelName(): ?string
    {
        $settings = $this->getSettings();
        return $settings->model !== '' ? $settings->model : null;
    }

    /**
     * Читает настройки только из cookie.
     */
    private function getCookieSettings(): AiSettingsDto
    {
        $request = Yii::$app->request;

        return new AiSettingsDto(
            baseUrl: $request->cookies->getValue(self::COOKIE_BASE_URL, ''),
            apiKey:  $request->cookies->getValue(self::COOKIE_API_KEY, ''),
            model:   $request->cookies->getValue(self::COOKIE_MODEL, ''),
        );
    }
}

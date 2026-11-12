<?php

declare(strict_types=1);

namespace modules\ai\presentation\controller;

use core\application\dto\ErrorDto;
use core\application\dto\SuccessDto;
use core\presentation\controller\BaseController;
use modules\ai\application\service\AiService;
use modules\ai\domain\exception\AiInvalidResponseException;
use modules\ai\domain\exception\AiRateLimitException;
use modules\ai\domain\exception\AiTimeoutException;
use modules\ai\domain\exception\AiTransportException;
use Throwable;
use Yii;

class AiController extends BaseController
{
    public function __construct(
        $id,
        $module,
        private readonly AiService $aiService,
        $config = [],
    ) {
        parent::__construct($id, $module, $config);
    }

    /**
     * GET /ai/settings
     *
     * Проверяет, установлены ли настройки AI (без возврата ключа).
     */
    public function actionSettings(): SuccessDto
    {
        $info = $this->aiService->getSettingsInfo();
        return $this->success($info);
    }

    /**
     * POST  /ai/settings
     *
     * Сохраняет настройки AI в httponly cookie.
     *
     * Body: { baseUrl: string, apiKey: string, model: string }
     */
    public function actionSaveSettings(): ErrorDto|SuccessDto
    {
        $request = Yii::$app->request;
        $baseUrl = trim((string)$request->getBodyParam('baseUrl', ''));
        $apiKey  = trim((string)$request->getBodyParam('apiKey', ''));
        $model   = trim((string)$request->getBodyParam('model', ''));

        if ($baseUrl === '' || $apiKey === '' || $model === '') {
            return $this->error(
                'All fields (baseUrl, apiKey, model) are required',
            );
        }

        $this->aiService->saveSettings($baseUrl, $apiKey, $model);

        return $this->success(
            ['model' => $model],
            'AI settings saved',
        );
    }

    /**
     * POST /ai/chat
     *
     * Проксирует запрос к нейросети.
     *
     * Body: { systemPrompt?: string, messages: array<{role: string, content: string}> }
     */
    public function actionChat(): ErrorDto|SuccessDto
    {
        if (!$this->aiService->hasSettings()) {
            return $this->error(
                'AI settings not configured. Please set baseUrl, apiKey and model first.',
            );
        }

        $request = Yii::$app->request;
        $systemPrompt = trim((string)$request->getBodyParam('systemPrompt', ''));
        $messages     = $request->getBodyParam('messages', []);

        if (!is_array($messages) || $messages === []) {
            return $this->error(
                'Field "messages" is required and must be a non-empty array',
            );
        }

        try {
            $response = $this->aiService->chat($systemPrompt, $messages);
            return $this->success($response);
        } catch (AiRateLimitException $e) {
            return $this->error('Rate limit exceeded. Please try later.', 429);
        } catch (AiTimeoutException $e) {
            return $this->error('AI request timed out. Please try again.', 504);
        } catch (AiInvalidResponseException $e) {
            return $this->error('Invalid response from AI service.', 502);
        } catch (AiTransportException $e) {
            return $this->error('AI service error: ' . $e->getMessage(), 502);
        } catch (Throwable $e) {
            Yii::error($e, 'ai');
            return $this->error('Internal server error', 500);
        }
    }
}

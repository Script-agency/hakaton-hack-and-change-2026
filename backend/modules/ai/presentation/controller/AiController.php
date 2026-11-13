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
use OpenApi\Attributes as OA;
use Throwable;
use Yii;

#[OA\Tag(
    name: 'ai',
    description: 'Управление настройками AI и проксирование запросов к нейросети',
)]
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

    #[OA\Get(
        path: '/ai/settings',
        description: 'Возвращает информацию о текущих настройках AI без раскрытия API-ключа. Базовые настройки берутся из ENV/params.php и могут быть переопределены через cookie.',
        summary: 'Проверка наличия настроек AI',
        tags: ['ai'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Успешно',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', example: true),
                        new OA\Property(
                            property: 'data',
                            properties: [
                                new OA\Property(property: 'hasSettings', type: 'boolean', example: true),
                                new OA\Property(property: 'model', type: 'string', example: 'gpt-4o-mini', nullable: true),
                                new OA\Property(property: 'baseUrl', type: 'string', example: 'https://api.openai.com/v1', nullable: true),
                            ],
                            type: 'object',
                        ),
                    ],
                ),
            ),
        ],
    )]
    /**
     * GET /ai/settings
     *
     * Проверяет, установлены ли настройки AI (без возврата ключа).
     * Возвращает model и baseUrl из объединённого источника (env + cookie).
     */
    public function actionSettings(): SuccessDto
    {
        $info = $this->aiService->getSettingsInfo();
        return $this->success($info);
    }

    #[OA\Post(
        path: '/ai/settings',
        description: 'Сохраняет baseUrl, apiKey и model в httponly cookie, переопределяя базовые настройки из ENV.',
        summary: 'Сохранение настроек AI (переопределение ENV)',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['baseUrl', 'apiKey', 'model'],
                properties: [
                    new OA\Property(property: 'baseUrl', type: 'string', example: 'https://api.openai.com/v1'),
                    new OA\Property(property: 'apiKey', type: 'string', example: 'sk-...'),
                    new OA\Property(property: 'model', type: 'string', example: 'gpt-4o-mini'),
                ],
                type: 'object',
            ),
        ),
        tags: ['ai'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Настройки сохранены',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', example: true),
                        new OA\Property(
                            property: 'data',
                            properties: [
                                new OA\Property(property: 'model', type: 'string', example: 'gpt-4o-mini'),
                            ],
                            type: 'object',
                        ),
                        new OA\Property(property: 'message', type: 'string', example: 'AI settings saved'),
                    ],
                ),
            ),
            new OA\Response(
                response: 400,
                description: 'Ошибка валидации (не заполнены обязательные поля)',
                content: new OA\JsonContent(ref: '#/components/schemas/Error'),
            ),
        ],
    )]
    /**
     * POST  /ai/settings
     *
     * Сохраняет настройки AI в httponly cookie, переопределяя базовые из ENV.
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

    #[OA\Post(
        path: '/ai/chat',
        description: 'Проксирует запрос к AI-провайдеру. Настройки берутся из ENV + cookie (cookie приоритетнее). Можно переопределить модель в теле запроса.',
        summary: 'Запрос к нейросети',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['messages'],
                properties: [
                    new OA\Property(
                        property: 'systemPrompt',
                        description: 'Системный промпт',
                        type: 'string',
                        nullable: true,
                    ),
                    new OA\Property(
                        property: 'modelOverride',
                        description: 'Переопределение модели для данного запроса',
                        type: 'string',
                        nullable: true,
                        example: 'gpt-4o',
                    ),
                    new OA\Property(
                        property: 'messages',
                        description: 'История сообщений (непустой массив)',
                        type: 'array',
                        items: new OA\Items(
                            required: ['role', 'content'],
                            properties: [
                                new OA\Property(
                                    property: 'role',
                                    type: 'string',
                                    enum: ['system', 'user', 'assistant'],
                                ),
                                new OA\Property(property: 'content', type: 'string'),
                            ],
                            type: 'object',
                        ),
                    ),
                ],
                type: 'object',
            ),
        ),
        tags: ['ai'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Успешный ответ от AI',
                content: new OA\JsonContent(ref: '#/components/schemas/Success'),
            ),
            new OA\Response(
                response: 400,
                description: 'Некорректный запрос или настройки AI не сконфигурированы',
                content: new OA\JsonContent(ref: '#/components/schemas/Error'),
            ),
            new OA\Response(
                response: 429,
                description: 'Превышен лимит запросов (rate limit)',
                content: new OA\JsonContent(ref: '#/components/schemas/Error'),
            ),
            new OA\Response(
                response: 500,
                description: 'Внутренняя ошибка сервера',
                content: new OA\JsonContent(ref: '#/components/schemas/Error'),
            ),
            new OA\Response(
                response: 502,
                description: 'Некорректный ответ от AI-сервиса или ошибка транспорта',
                content: new OA\JsonContent(ref: '#/components/schemas/Error'),
            ),
            new OA\Response(
                response: 504,
                description: 'Таймаут запроса к AI-сервису',
                content: new OA\JsonContent(ref: '#/components/schemas/Error'),
            ),
        ],
    )]
    /**
     * POST /ai/chat
     *
     * Проксирует запрос к нейросети. Настройки — ENV + cookie (cookie приоритетнее).
     * modelOverride опционально переопределяет модель для одного запроса.
     *
     * Body: { systemPrompt?: string, modelOverride?: string, messages: array<{role: string, content: string}> }
     */
    public function actionChat(): ErrorDto|SuccessDto
    {
        if (!$this->aiService->hasSettings()) {
            return $this->error(
                'AI settings not configured. Please set baseUrl, apiKey and model in .env or via POST /ai/settings.',
            );
        }

        $request = Yii::$app->request;
        $systemPrompt  = trim((string)$request->getBodyParam('systemPrompt', ''));
        $modelOverride = trim((string)$request->getBodyParam('modelOverride', ''));
        $messages      = $request->getBodyParam('messages', []);

        if (!is_array($messages) || $messages === []) {
            return $this->error(
                'Field "messages" is required and must be a non-empty array',
            );
        }

        try {
            $response = $this->aiService->chat($systemPrompt, $messages, $modelOverride !== '' ? $modelOverride : null);
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

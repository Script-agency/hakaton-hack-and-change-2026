<?php

declare(strict_types=1);

namespace modules\generation\presentation\controller;

use modules\generation\domain\exception\BadGatewayException;
use modules\generation\domain\exception\ServiceUnavailableException;
use modules\generation\application\service\GenerationChatService;
use modules\generation\application\dto\ChatCreatedDto;
use modules\generation\application\dto\ChatDetailDto;
use modules\generation\application\dto\ChatMessageDto;
use modules\generation\application\dto\ChatListItemDto;
use core\presentation\controller\BaseController;
use core\application\dto\ErrorDto;
use core\domain\exception\EntityNotFoundException;
use OpenApi\Attributes as OA;
use Yii;
use yii\base\InvalidConfigException;
use yii\httpclient\Client;
use yii\httpclient\Exception;
use yii\web\BadRequestHttpException;
use Throwable;

#[OA\Tag(
    name: 'generation',
    description: 'Проксирование запросов к сервису генерации (LLM)',
)]
class GenerationController extends BaseController
{
    public function __construct(
        $id,
        $module,
        private readonly Client $httpClient,
        private readonly GenerationChatService $chatService,
        $config = [],
    ) {
        parent::__construct($id, $module, $config);
    }

    #[OA\Post(
        path: '/generation/chat/new',
        description: 'Создаёт новый чат для клиента по отпечатку браузера (fingerprint). '
        . 'Возвращает id созданного чата.',
        summary: 'Создание нового чата',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['fingerprint'],
                properties: [
                    new OA\Property(property: 'fingerprint', type: 'string', example: 'a1b2c3d4e5f6...'),
                ],
                type: 'object',
            ),
        ),
        tags: ['generation'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Чат создан',
                content: new OA\JsonContent(ref: '#/components/schemas/ChatCreated'),
            ),
            new OA\Response(
                response: 400,
                description: 'Не передано обязательное поле "fingerprint"',
                content: new OA\JsonContent(ref: '#/components/schemas/Error'),
            ),
        ],
    )]
    /**
     * POST /generation/chat/new
     * Body: { fingerprint: string }
     */
    public function actionChatNew(): ErrorDto|ChatCreatedDto
    {
        $body = Yii::$app->request->getBodyParams();
        $fingerprint = trim((string)($body['fingerprint'] ?? ''));

        if ($fingerprint === '') {
            throw new BadRequestHttpException('Field "fingerprint" is required.');
        }

        return $this->chatService->createChat($fingerprint);
    }

    /** @return array<int, ChatListItemDto> */
    #[OA\Get(
        path: '/generation/chat/list',
        description: 'Возвращает список всех чатов клиента по fingerprint (обязательный query-параметр). '
        . 'Чаты сортируются от новых к старым.',
        summary: 'Список чатов клиента',
        tags: ['generation'],
        parameters: [
            new OA\Parameter(
                name: 'fingerprint',
                in: 'query',
                required: true,
                schema: new OA\Schema(type: 'string'),
                example: 'a1b2c3d4e5f6...',
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Список чатов',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: '#/components/schemas/ChatListItem'),
                ),
            ),
            new OA\Response(
                response: 400,
                description: 'Не передан fingerprint',
                content: new OA\JsonContent(ref: '#/components/schemas/Error'),
            ),
        ],
    )]
    /**
     * GET /generation/chat/list?fingerprint=...
     */
    public function actionChatList(): array
    {
        $fingerprint = trim((string)Yii::$app->request->get('fingerprint', ''));

        if (YII_ENV_DEV && $fingerprint === '') {
            return $this->chatService->listAllChats();
        }

        if ($fingerprint === '') {
            throw new BadRequestHttpException('Query parameter "fingerprint" is required.');
        }

        return $this->chatService->listChatsByFingerprint($fingerprint);
    }

    #[OA\Get(
        path: '/generation/chat/{id}',
        description: 'Возвращает детали чата с указанным id, включая все сообщения (историю переписки). '
        . 'Каждое сообщение содержит точное время создания.',
        summary: 'Просмотр конкретного чата с историей',
        tags: ['generation'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer'),
                example: 1,
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Детали чата и история сообщений',
                content: new OA\JsonContent(ref: '#/components/schemas/ChatDetail'),
            ),
            new OA\Response(
                response: 404,
                description: 'Чат не найден',
                content: new OA\JsonContent(ref: '#/components/schemas/Error'),
            ),
        ],
    )]
    /**
     * GET /generation/chat/{id}
     */
    public function actionChatGet(): ErrorDto|ChatDetailDto
    {
        $chatId = (int)(Yii::$app->request->get('id', 0));

        if ($chatId <= 0) {
            throw new BadRequestHttpException('Invalid chat id.');
        }

        try {
            return $this->chatService->getChat($chatId);
        } catch (EntityNotFoundException $e) {
            return $this->error($e->getMessage(), 404);
        }
    }

    /** @return array<string, mixed> */
    #[OA\Post(
        path: '/generation/chat',
        description: 'Проксирует запрос к внешнему generation-сервису (POST /v1/generation/chat). '
        . 'Тело запроса передаётся как есть; обязательными являются поля "question" и "conversation_id". '
        . 'Вопрос пользователя и ответ модели сохраняются в историю чата.',
        summary: 'Чат с генеративной моделью (с сохранением истории)',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/GenerationChatRequest'),
        ),
        tags: ['generation'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Ответ генеративного сервиса (структура определяется сервисом)',
                content: new OA\JsonContent(ref: '#/components/schemas/GenerationChatResponse'),
            ),
            new OA\Response(
                response: 400,
                description: 'Не передано обязательное поле "question" или "conversation_id"',
                content: new OA\JsonContent(ref: '#/components/schemas/Error'),
            ),
            new OA\Response(
                response: 404,
                description: 'Указанный conversation_id не найден',
                content: new OA\JsonContent(ref: '#/components/schemas/Error'),
            ),
            new OA\Response(
                response: 502,
                description: 'Сервис генерации вернул некорректный ответ',
                content: new OA\JsonContent(ref: '#/components/schemas/Error'),
            ),
            new OA\Response(
                response: 503,
                description: 'Сервис генерации недоступен (транспортная ошибка / таймаут)',
                content: new OA\JsonContent(ref: '#/components/schemas/Error'),
            ),
        ],
    )]
    /**
     * @throws InvalidConfigException
     * @throws Exception
     * @throws BadRequestHttpException
     */
    public function actionChat(): array
    {
        $body = Yii::$app->request->getBodyParams();
        $question = trim((string)($body['question'] ?? ''));
        $conversationId = (int)($body['conversation_id'] ?? 0);

        if ($question === '') {
            throw new BadRequestHttpException('Field "question" is required.');
        }
        if ($conversationId <= 0) {
            throw new BadRequestHttpException('Field "conversation_id" is required and must be a positive integer.');
        }

        // Состояние чата проверяется до вызова генерации: завершённые диалоги больше не обслуживаются AI.
        try {
            $chatDetail = $this->chatService->getChat($conversationId);
        } catch (EntityNotFoundException $e) {
            throw new BadRequestHttpException('Chat with conversation_id ' . $conversationId . ' not found.');
        }

        if ($chatDetail->is_completed) {
            $answer = 'Этот диалог уже передан консультанту. Чтобы получить помощь, заполните, пожалуйста, форму заявки.';
            $this->chatService->addMessage($conversationId, 'user', $question);
            $this->chatService->addMessage($conversationId, 'assistant', $answer);

            return [
                'answer' => $answer,
                'sources' => [],
                'routing' => null,
                'is_completed' => true,
                'summary' => $chatDetail->summary,
            ];
        }

        // Сохраняем вопрос пользователя в истории чата.
        $this->chatService->addMessage($conversationId, 'user', $question);

        // Передаём Python полную историю и метаданные чата.
        $chatDetail = $this->chatService->getChat($conversationId);
        $body['chat_messages'] = [
            'id' => $chatDetail->id,
            'fingerprint' => $chatDetail->fingerprint,
            'created_at' => $chatDetail->created_at,
            'is_completed' => $chatDetail->is_completed,
            'summary' => $chatDetail->summary,
            'messages' => array_map(static function (ChatMessageDto $msg): array {
                return [
                    'id' => $msg->id,
                    'chat_id' => $msg->chat_id,
                    'role' => $msg->role,
                    'content' => $msg->content,
                    'created_at' => $msg->created_at,
                    'sources' => $msg->sources,
                ];
            }, $chatDetail->messages),
        ];

        $baseUrl = rtrim((string)($_ENV['GENERATION_SERVICE_URL'] ?? 'http://generation:8000'), '/');
        try {
            $response = $this->httpClient->createRequest()
                ->setMethod('POST')
                ->setUrl($baseUrl . '/v1/generation/chat')
                ->setFormat(Client::FORMAT_JSON)
                ->setData($body)
                ->setOptions([
                    'timeout' => (int)($_ENV['GENERATION_HTTP_TIMEOUT'] ?? 180),
                    'connectTimeout' => (int)($_ENV['GENERATION_CONNECT_TIMEOUT'] ?? 5),
                ])
                ->send();
        } catch (Throwable $e) {
            Yii::error('Generation service transport error: ' . $e->getMessage(), 'generation');
            throw new ServiceUnavailableException('Generation service is unavailable.');
        }

        $decoded = json_decode($response->getContent(), true);
        if (!is_array($decoded)) {
            Yii::error('Generation service returned invalid JSON.', 'generation');
            throw new BadGatewayException('Generation service returned an invalid response.');
        }

        $statusCode = (int)$response->getStatusCode();

        // Известные ошибки Python возвращаем как человекочитаемые ответы и сохраняем в истории.
        $errorMessages = require __DIR__ . '/../../config/error-messages.php';
        if ($statusCode >= 400 && isset($errorMessages[$statusCode])) {
            $errorPhrase = $errorMessages[$statusCode];
            try {
                $this->chatService->addMessage($conversationId, 'assistant', $errorPhrase);
            } catch (EntityNotFoundException $e) {
                Yii::warning('Chat ' . $conversationId . ' disappeared while saving error response.', 'generation');
            }

            Yii::warning(['status' => $statusCode, 'body' => $decoded], 'generation');
            Yii::$app->response->statusCode = $statusCode;
            $errorDetail = (string)($decoded['detail'] ?? $decoded['message'] ?? $decoded['error'] ?? 'Unknown error');

            return [
                'answer' => $errorPhrase,
                'sources' => [],
                'routing' => null,
                'is_completed' => false,
                'summary' => null,
                'debug' => [
                    'time' => date('c'),
                    'error' => [
                        'code' => $statusCode,
                        'message' => $errorDetail,
                    ],
                ],
            ];
        }

        $answer = (string)($decoded['response'] ?? $decoded['answer'] ?? $decoded['content'] ?? '');
        $isCompleted = ($decoded['is_completed'] ?? false) === true;
        $summary = is_string($decoded['summary'] ?? null) ? trim($decoded['summary']) : '';

        // Завершение фиксируется только при наличии агентского summary, пригодного для передачи в лид.
        if ($isCompleted && $summary !== '') {
            try {
                $this->chatService->completeChat($conversationId, $summary);
            } catch (EntityNotFoundException $e) {
                Yii::warning('Chat ' . $conversationId . ' disappeared while saving completion state.', 'generation');
                $isCompleted = false;
                $summary = '';
            }
        } else {
            $isCompleted = false;
            $summary = '';
        }

        $sources = is_array($decoded['sources'] ?? null) ? $decoded['sources'] : [];
        if ($answer !== '') {
            try {
                $this->chatService->addMessage($conversationId, 'assistant', $answer, $sources);
            } catch (EntityNotFoundException $e) {
                Yii::warning('Chat ' . $conversationId . ' disappeared while saving assistant response.', 'generation');
            }
        }

        $decoded['is_completed'] = $isCompleted;
        $decoded['summary'] = $isCompleted ? $summary : null;

        if (!$response->isOk) {
            Yii::warning(['status' => $statusCode, 'body' => $decoded], 'generation');
            Yii::$app->response->statusCode = $statusCode >= 400 ? $statusCode : 502;
        }
        return $decoded;
    }
}
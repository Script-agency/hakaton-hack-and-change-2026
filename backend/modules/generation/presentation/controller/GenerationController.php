<?php

declare(strict_types=1);

namespace modules\generation\presentation\controller;

use modules\generation\domain\exception\BadGatewayException;
use core\presentation\controller\BaseController;
use modules\generation\domain\exception\ServiceUnavailableException;
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
    public function __construct($id, $module, private readonly Client $httpClient, $config = [])
    {
        parent::__construct($id, $module, $config);
    }

    #[OA\Post(
        path: '/generation/chat',
        description: 'Проксирует запрос к внешнему generation-сервису (POST /v1/generation/chat). '
        . 'Тело запроса передаётся как есть; обязательным является поле "question".',
        summary: 'Чат с генеративной моделью',
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
                description: 'Не передано обязательное поле "question"',
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
        if ($question === '') {
            throw new BadRequestHttpException('Field "question" is required.');
        }

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
        if (!$response->isOk) {
            Yii::warning(['status' => $response->getStatusCode(), 'body' => $decoded], 'generation');
            Yii::$app->response->statusCode = (int)$response->getStatusCode() >= 400 ? (int)$response->getStatusCode() : 502;
        }
        return $decoded;
    }
}

<?php

declare(strict_types=1);

namespace modules\knowledge\presentation\controller;

use core\domain\exception\ValidationException;
use core\presentation\controller\BaseController;
use modules\knowledge\application\service\KnowledgeService;
use OpenApi\Attributes as OA;
use Yii;
use yii\base\InvalidConfigException;
use yii\web\BadRequestHttpException;
use yii\web\Response;

#[OA\Tag(
    name: 'internal-knowledge',
    description: 'Внутренний API базы знаний (для сервисов платформы)',
)]
class InternalKnowledgeController extends BaseController
{
    public function __construct(
        $id,
        $module,
        private readonly KnowledgeService $knowledge,
        $config = []
    ) {
        parent::__construct($id, $module, $config);
    }

    #[OA\Get(
        path: '/internal/v1/knowledge/categories',
        summary: 'Список активных категорий',
        tags: ['internal-knowledge'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Успешно',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(
                            property: 'items',
                            type: 'array',
                            items: new OA\Items(ref: '#/components/schemas/KnowledgeCategory'),
                        ),
                    ],
                ),
            ),
        ],
    )]
    public function actionCategories(): array
    {
        return ['items' => $this->knowledge->listCategories(true)];
    }

    #[OA\Post(
        path: '/internal/v1/knowledge/retrieve',
        summary: 'Retrieve частей базы знаний',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/RetrieveRequest'),
        ),
        tags: ['internal-knowledge'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Успешно',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(
                            property: 'items',
                            type: 'array',
                            items: new OA\Items(ref: '#/components/schemas/KnowledgePart'),
                        ),
                    ],
                ),
            ),
            new OA\Response(response: 400, description: 'Ошибка валидации'),
        ],
    )]
    /**
     * @throws InvalidConfigException
     */
    public function actionRetrieve(): array
    {
        $body = Yii::$app->request->getBodyParams();
        $categories = $body['categorySlugs'] ?? [];
        if (!is_array($categories)) {
            $categories = [];
        }
        $categories = array_values(array_filter(array_map('strval', $categories)));
        return ['items' => $this->knowledge->retrieve($categories, (int)($body['limit'] ?? 50))];
    }

    #[OA\Get(
        path: '/internal/v1/knowledge/documents/{id}/file',
        summary: 'Получить исходный файл документа',
        tags: ['internal-knowledge'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Бинарное содержимое файла (inline)',
                content: [new OA\MediaType(mediaType: 'application/octet-stream', schema: new OA\Schema(type: 'string', format: 'binary'))],
            ),
            new OA\Response(response: 404, description: 'Документ не найден'),
        ],
    )]
    public function actionDocumentFile(int $id)
    {
        $file = $this->knowledge->documentPath($id);
        return Yii::$app->response->sendFile($file['path'], 'knowledge-source-' . $id . '.' . pathinfo($file['path'], PATHINFO_EXTENSION), [
            'mimeType' => $file['mimeType'], 'inline' => true,
        ]);
    }

    #[OA\Get(
        path: '/internal/v1/knowledge/parts/{id}/content',
        summary: 'Получить текстовое содержимое части',
        tags: ['internal-knowledge'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Текстовое содержимое',
                content: [new OA\MediaType(mediaType: 'text/plain', schema: new OA\Schema(type: 'string'))],
            ),
            new OA\Response(response: 204, description: 'Текст для части отсутствует (извлечён из источника)'),
        ],
    )]
    public function actionPartContent(int $id)
    {
        $content = $this->knowledge->readPartContent($id);
        if ($content === null) {
            Yii::$app->response->statusCode = 204;
            return null;
        }
        Yii::$app->response->format = Response::FORMAT_RAW;
        Yii::$app->response->headers->set('Content-Type', 'text/plain; charset=UTF-8');
        return $content;
    }

    #[OA\Post(
        path: '/internal/v1/knowledge/parts/{id}/cache',
        summary: 'Закешировать текстовое содержимое части',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/CachePartRequest'),
        ),
        tags: ['internal-knowledge'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Успешно',
                content: new OA\JsonContent(ref: '#/components/schemas/CachePartResponse'),
            ),
            new OA\Response(response: 400, description: 'Не передан content или ошибка валидации'),
            new OA\Response(response: 404, description: 'Часть не найдена'),
        ],
    )]
    /**
     * @throws ValidationException
     * @throws InvalidConfigException
     * @throws BadRequestHttpException
     */
    public function actionCachePart(int $id): array
    {
        $body = Yii::$app->request->getBodyParams();
        $content = (string)($body['content'] ?? '');
        if (trim($content) === '') {
            throw new BadRequestHttpException('Field "content" is required.');
        }
        $this->knowledge->cachePartContent(
            $id,
            (int)($body['documentRevision'] ?? 0),
            (int)($body['partRevision'] ?? 0),
            $content,
        );
        return ['cached' => true];
    }
}

<?php

declare(strict_types=1);

namespace modules\knowledge\presentation\controller;

use core\domain\exception\ValidationException;
use core\presentation\controller\BaseController;
use modules\knowledge\application\service\KnowledgeService;
use OpenApi\Attributes as OA;
use Throwable;
use Yii;
use yii\base\InvalidConfigException;
use yii\web\BadRequestHttpException;
use yii\web\NotFoundHttpException;
use yii\web\UploadedFile;

#[OA\Tag(
    name: 'admin-knowledge',
    description: 'Администрирование базы знаний: категории, документы, части',
)]
class AdminKnowledgeController extends BaseController
{
    public function __construct($id, $module, private readonly KnowledgeService $knowledge, $config = [])
    {
        parent::__construct($id, $module, $config);
    }

    #[OA\Get(
        path: '/admin/knowledge/categories',
        summary: 'Список категорий',
        tags: ['admin-knowledge'],
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
        return ['items' => $this->knowledge->listCategories()];
    }

    #[OA\Get(
        path: '/admin/knowledge/categories/{id}',
        summary: 'Получить категорию',
        tags: ['admin-knowledge'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Успешно',
                content: new OA\JsonContent(
                    properties: [new OA\Property(property: 'item', ref: '#/components/schemas/KnowledgeCategory')],
                ),
            ),
            new OA\Response(response: 404, description: 'Категория не найдена'),
        ],
    )]
    /**
     * @throws NotFoundHttpException
     */
    public function actionCategory(int $id): array
    {
        foreach ($this->knowledge->listCategories() as $category) {
            if ((int)$category['id'] === $id) {
                return ['item' => $category];
            }
        }
        throw new NotFoundHttpException('Knowledge category not found.');
    }

    #[OA\Post(
        path: '/admin/knowledge/categories',
        summary: 'Создать категорию',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/CreateKnowledgeCategoryRequest'),
        ),
        tags: ['admin-knowledge'],
        responses: [
            new OA\Response(
                response: 201,
                description: 'Категория создана',
                content: new OA\JsonContent(
                    properties: [new OA\Property(property: 'item', ref: '#/components/schemas/KnowledgeCategory')],
                ),
            ),
            new OA\Response(response: 400, description: 'Ошибка валидации'),
        ],
    )]
    public function actionCreateCategory(): array
    {
        Yii::$app->response->statusCode = 201;
        return ['item' => $this->knowledge->createCategory(Yii::$app->request->getBodyParams())];
    }

    #[OA\Patch(
        path: '/admin/knowledge/categories/{id}',
        summary: 'Обновить категорию',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/UpdateKnowledgeCategoryRequest'),
        ),
        tags: ['admin-knowledge'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Успешно',
                content: new OA\JsonContent(
                    properties: [new OA\Property(property: 'item', ref: '#/components/schemas/KnowledgeCategory')],
                ),
            ),
            new OA\Response(response: 400, description: 'Ошибка валидации'),
            new OA\Response(response: 404, description: 'Категория не найдена'),
        ],
    )]
    /**
     * @throws ValidationException
     * @throws InvalidConfigException
     */
    public function actionUpdateCategory(int $id): array
    {
        return ['item' => $this->knowledge->updateCategory($id, Yii::$app->request->getBodyParams())];
    }

    #[OA\Delete(
        path: '/admin/knowledge/categories/{id}',
        summary: 'Удалить категорию',
        tags: ['admin-knowledge'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 204, description: 'Удалено'),
            new OA\Response(response: 404, description: 'Категория не найдена'),
        ],
    )]
    /**
     * @throws ValidationException
     */
    public function actionDeleteCategory(int $id): array
    {
        $this->knowledge->deleteCategory($id);
        Yii::$app->response->statusCode = 204;
        return [];
    }

    #[OA\Get(
        path: '/admin/knowledge/documents',
        summary: 'Список документов',
        tags: ['admin-knowledge'],
        parameters: [
            new OA\Parameter(name: 'status', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'search', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'categoryId', in: 'query', required: false, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'limit', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 20)),
            new OA\Parameter(name: 'offset', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 0)),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Успешно',
                content: new OA\JsonContent(ref: '#/components/schemas/KnowledgeDocumentList'),
            ),
        ],
    )]
    public function actionDocuments(): array
    {
        $result = $this->knowledge->listDocuments([
            'status'    => Yii::$app->request->get('status'),
            'search'    => Yii::$app->request->get('search'),
            'category_id' => Yii::$app->request->get('categoryId'),
            'limit'     => Yii::$app->request->get('limit', 20),
            'offset'    => Yii::$app->request->get('offset', 0),
        ]);
        return ['items' => $result['items'], '_meta' => ['total' => $result['total']]];
    }

    #[OA\Post(
        path: '/admin/knowledge/documents',
        description: 'Multipart-загрузка файла документа вместе с метаданными.',
        summary: 'Загрузить документ',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    required: ['file'],
                    properties: [
                        new OA\Property(property: 'file', description: 'Файл документа', type: 'string', format: 'binary'),
                        new OA\Property(property: 'categoryId', type: 'integer', nullable: true),
                        new OA\Property(property: 'title', type: 'string', nullable: true),
                        new OA\Property(property: 'description', type: 'string', nullable: true),
                    ],
                ),
            ),
        ),
        tags: ['admin-knowledge'],
        responses: [
            new OA\Response(
                response: 201,
                description: 'Документ создан',
                content: new OA\JsonContent(
                    properties: [new OA\Property(property: 'item', ref: '#/components/schemas/KnowledgeDocument')],
                ),
            ),
            new OA\Response(response: 400, description: 'Не передан файл или ошибка валидации'),
        ],
    )]
    /**
     * @throws Throwable
     * @throws InvalidConfigException
     * @throws BadRequestHttpException
     */
    public function actionCreateDocument(): array
    {
        $file = UploadedFile::getInstanceByName('file');
        if ($file === null) {
            throw new BadRequestHttpException('Multipart field "file" is required.');
        }
        $data = Yii::$app->request->getBodyParams();
        Yii::$app->response->statusCode = 201;
        return ['item' => $this->knowledge->createDocument($file, $data)];
    }

    #[OA\Get(
        path: '/admin/knowledge/documents/{id}',
        summary: 'Получить документ',
        tags: ['admin-knowledge'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Успешно',
                content: new OA\JsonContent(
                    properties: [new OA\Property(property: 'item', ref: '#/components/schemas/KnowledgeDocument')],
                ),
            ),
            new OA\Response(response: 404, description: 'Документ не найден'),
        ],
    )]
    public function actionDocument(int $id): array
    {
        return ['item' => $this->knowledge->getDocument($id)];
    }

    #[OA\Patch(
        path: '/admin/knowledge/documents/{id}',
        summary: 'Обновить документ',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/UpdateKnowledgeDocumentRequest'),
        ),
        tags: ['admin-knowledge'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Успешно',
                content: new OA\JsonContent(
                    properties: [new OA\Property(property: 'item', ref: '#/components/schemas/KnowledgeDocument')],
                ),
            ),
            new OA\Response(response: 400, description: 'Ошибка валидации'),
            new OA\Response(response: 404, description: 'Документ не найден'),
        ],
    )]
    /**
     * @throws InvalidConfigException
     */
    public function actionUpdateDocument(int $id): array
    {
        return ['item' => $this->knowledge->updateDocument($id, Yii::$app->request->getBodyParams())];
    }

    #[OA\Put(
        path: '/admin/knowledge/documents/{id}/file',
        summary: 'Заменить файл документа',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    required: ['file'],
                    properties: [
                        new OA\Property(property: 'file', type: 'string', format: 'binary'),
                    ],
                ),
            ),
        ),
        tags: ['admin-knowledge'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Файл заменён',
                content: new OA\JsonContent(
                    properties: [new OA\Property(property: 'item', ref: '#/components/schemas/KnowledgeDocument')],
                ),
            ),
            new OA\Response(response: 400, description: 'Не передан файл'),
            new OA\Response(response: 404, description: 'Документ не найден'),
        ],
    )]
    /**
     * @throws Throwable
     * @throws BadRequestHttpException
     */
    public function actionReplaceDocument(int $id): array
    {
        $file = UploadedFile::getInstanceByName('file');
        if ($file === null) {
            throw new BadRequestHttpException('Multipart field "file" is required.');
        }
        return ['item' => $this->knowledge->replaceDocumentFile($id, $file)];
    }

    #[OA\Delete(
        path: '/admin/knowledge/documents/{id}',
        summary: 'Удалить документ',
        tags: ['admin-knowledge'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 204, description: 'Удалено'),
            new OA\Response(response: 404, description: 'Документ не найден'),
        ],
    )]
    /**
     * @throws Throwable
     */
    public function actionDeleteDocument(int $id): array
    {
        $this->knowledge->deleteDocument($id);
        Yii::$app->response->statusCode = 204;
        return [];
    }

    #[OA\Get(
        path: '/admin/knowledge/documents/{id}/file',
        summary: 'Скачать файл документа',
        tags: ['admin-knowledge'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Бинарное содержимое файла',
                content: [new OA\MediaType(mediaType: 'application/octet-stream', schema: new OA\Schema(type: 'string', format: 'binary'))],
            ),
            new OA\Response(response: 404, description: 'Документ не найден'),
        ],
    )]
    public function actionDownloadDocument(int $id)
    {
        $file = $this->knowledge->documentPath($id);
        return Yii::$app->response->sendFile($file['path'], $file['filename'], [
            'mimeType' => $file['mimeType'],
            'inline' => false,
        ]);
    }

    #[OA\Get(
        path: '/admin/knowledge/documents/{documentId}/parts',
        summary: 'Список частей документа',
        tags: ['admin-knowledge'],
        parameters: [
            new OA\Parameter(name: 'documentId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
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
            new OA\Response(response: 404, description: 'Документ не найден'),
        ],
    )]
    public function actionParts(int $documentId): array
    {
        return ['items' => $this->knowledge->listParts($documentId)];
    }

    #[OA\Post(
        path: '/admin/knowledge/documents/{documentId}/parts',
        summary: 'Создать часть документа',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/CreateKnowledgePartRequest'),
        ),
        tags: ['admin-knowledge'],
        parameters: [
            new OA\Parameter(name: 'documentId', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 201,
                description: 'Часть создана',
                content: new OA\JsonContent(
                    properties: [new OA\Property(property: 'item', ref: '#/components/schemas/KnowledgePart')],
                ),
            ),
            new OA\Response(response: 400, description: 'Ошибка валидации'),
        ],
    )]
    /**
     * @throws Throwable
     * @throws InvalidConfigException
     */
    public function actionCreatePart(int $documentId): array
    {
        Yii::$app->response->statusCode = 201;
        return ['item' => $this->knowledge->createPart($documentId, Yii::$app->request->getBodyParams())];
    }

    #[OA\Get(
        path: '/admin/knowledge/parts/{id}',
        summary: 'Получить часть',
        tags: ['admin-knowledge'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Успешно',
                content: new OA\JsonContent(
                    properties: [new OA\Property(property: 'item', ref: '#/components/schemas/KnowledgePart')],
                ),
            ),
            new OA\Response(response: 404, description: 'Часть не найдена'),
        ],
    )]
    public function actionPart(int $id): array
    {
        return ['item' => $this->knowledge->getPart($id)];
    }

    #[OA\Patch(
        path: '/admin/knowledge/parts/{id}',
        summary: 'Обновить часть',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/UpdateKnowledgePartRequest'),
        ),
        tags: ['admin-knowledge'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Успешно',
                content: new OA\JsonContent(
                    properties: [new OA\Property(property: 'item', ref: '#/components/schemas/KnowledgePart')],
                ),
            ),
            new OA\Response(response: 400, description: 'Ошибка валидации'),
            new OA\Response(response: 404, description: 'Часть не найдена'),
        ],
    )]
    /**
     * @throws Throwable
     * @throws InvalidConfigException
     */
    public function actionUpdatePart(int $id): array
    {
        return ['item' => $this->knowledge->updatePart($id, Yii::$app->request->getBodyParams())];
    }

    #[OA\Delete(
        path: '/admin/knowledge/parts/{id}',
        summary: 'Удалить часть',
        tags: ['admin-knowledge'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 204, description: 'Удалено'),
            new OA\Response(response: 404, description: 'Часть не найдена'),
        ],
    )]
    public function actionDeletePart(int $id): array
    {
        $this->knowledge->deletePart($id);
        Yii::$app->response->statusCode = 204;
        return [];
    }

    #[OA\Get(
        path: '/admin/knowledge/parts/{id}/content',
        summary: 'Скачать текстовое содержимое части',
        tags: ['admin-knowledge'],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Текстовое содержимое',
                content: [new OA\MediaType(mediaType: 'text/plain', schema: new OA\Schema(type: 'string'))],
            ),
            new OA\Response(response: 404, description: 'Часть не найдена или не имеет отдельного текста'),
        ],
    )]
    /**
     * @throws NotFoundHttpException
     */
    public function actionPartContent(int $id)
    {
        $content = $this->knowledge->readPartContent($id);
        if ($content === null) {
            throw new NotFoundHttpException('This knowledge part is extracted from the source file and has no separately stored text.');
        }
        Yii::$app->response->format = Yii\web\Response::FORMAT_RAW;
        Yii::$app->response->headers->set('Content-Type', 'text/plain; charset=UTF-8');
        Yii::$app->response->headers->set('Content-Disposition', 'attachment; filename="knowledge-part-' . $id . '.txt"');
        return $content;
    }
}

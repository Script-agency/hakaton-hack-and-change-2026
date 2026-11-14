<?php

declare(strict_types=1);

namespace modules\knowledge\presentation\controller;

use core\domain\exception\ValidationException;
use core\presentation\controller\BaseController;
use modules\knowledge\application\service\KnowledgeService;
use Throwable;
use Yii;
use yii\base\InvalidConfigException;
use yii\web\BadRequestHttpException;
use yii\web\NotFoundHttpException;
use yii\web\UploadedFile;

class AdminKnowledgeController extends BaseController
{
    public function __construct($id, $module, private readonly KnowledgeService $knowledge, $config = [])
    {
        parent::__construct($id, $module, $config);
    }

    public function actionCategories(): array
    {
        return ['items' => $this->knowledge->listCategories()];
    }

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

    public function actionCreateCategory(): array
    {
        Yii::$app->response->statusCode = 201;
        return ['item' => $this->knowledge->createCategory(Yii::$app->request->getBodyParams())];
    }

    /**
     * @throws ValidationException
     * @throws InvalidConfigException
     */
    public function actionUpdateCategory(int $id): array
    {
        return ['item' => $this->knowledge->updateCategory($id, Yii::$app->request->getBodyParams())];
    }

    /**
     * @throws ValidationException
     */
    public function actionDeleteCategory(int $id): array
    {
        $this->knowledge->deleteCategory($id);
        Yii::$app->response->statusCode = 204;
        return [];
    }

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

    public function actionDocument(int $id): array
    {
        return ['item' => $this->knowledge->getDocument($id)];
    }

    /**
     * @throws InvalidConfigException
     */
    public function actionUpdateDocument(int $id): array
    {
        return ['item' => $this->knowledge->updateDocument($id, Yii::$app->request->getBodyParams())];
    }

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

    /**
     * @throws Throwable
     */
    public function actionDeleteDocument(int $id): array
    {
        $this->knowledge->deleteDocument($id);
        Yii::$app->response->statusCode = 204;
        return [];
    }

    public function actionDownloadDocument(int $id)
    {
        $file = $this->knowledge->documentPath($id);
        return Yii::$app->response->sendFile($file['path'], $file['filename'], [
            'mimeType' => $file['mimeType'],
            'inline' => false,
        ]);
    }

    public function actionParts(int $documentId): array
    {
        return ['items' => $this->knowledge->listParts($documentId)];
    }

    /**
     * @throws Throwable
     * @throws InvalidConfigException
     */
    public function actionCreatePart(int $documentId): array
    {
        Yii::$app->response->statusCode = 201;
        return ['item' => $this->knowledge->createPart($documentId, Yii::$app->request->getBodyParams())];
    }

    public function actionPart(int $id): array
    {
        return ['item' => $this->knowledge->getPart($id)];
    }

    /**
     * @throws Throwable
     * @throws InvalidConfigException
     */
    public function actionUpdatePart(int $id): array
    {
        return ['item' => $this->knowledge->updatePart($id, Yii::$app->request->getBodyParams())];
    }

    public function actionDeletePart(int $id): array
    {
        $this->knowledge->deletePart($id);
        Yii::$app->response->statusCode = 204;
        return [];
    }

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

    private function bearerToken(): string
    {
        $header = (string)Yii::$app->request->headers->get('Authorization', '');
        return preg_match('/^Bearer\s+(.+)$/i', $header, $matches) ? trim($matches[1]) : '';
    }
}

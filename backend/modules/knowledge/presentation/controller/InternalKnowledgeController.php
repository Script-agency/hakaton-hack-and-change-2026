<?php

declare(strict_types=1);

namespace modules\knowledge\presentation\controller;

use core\domain\exception\ValidationException;
use core\presentation\controller\BaseController;
use modules\knowledge\application\service\KnowledgeService;
use Yii;
use yii\base\InvalidConfigException;
use yii\web\BadRequestHttpException;
use yii\web\Response;

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

    public function actionCategories(): array
    {
        return ['items' => $this->knowledge->listCategories(true)];
    }

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

    public function actionDocumentFile(int $id)
    {
        $file = $this->knowledge->documentPath($id);
        return Yii::$app->response->sendFile($file['path'], 'knowledge-source-' . $id . '.' . pathinfo($file['path'], PATHINFO_EXTENSION), [
            'mimeType' => $file['mimeType'], 'inline' => true,
        ]);
    }

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

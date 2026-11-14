<?php

declare(strict_types=1);

namespace modules\knowledge\application\service;

use core\domain\exception\EntityNotFoundException;
use core\domain\exception\FileStorageException;
use core\domain\exception\ValidationException;
use modules\knowledge\infrastructure\persistence\KnowledgeCategoryAR;
use modules\knowledge\infrastructure\persistence\KnowledgeDocumentAR;
use modules\knowledge\infrastructure\persistence\KnowledgePartAR;
use modules\knowledge\infrastructure\storage\KnowledgeCache;
use modules\knowledge\infrastructure\storage\LocalFileStorage;
use Throwable;
use Yii;
use yii\db\Exception;
use yii\db\Query;
use yii\db\StaleObjectException;
use yii\web\UploadedFile;

final class KnowledgeService
{
    private const CACHE_TTL = 3600;

    public function __construct(
        private readonly LocalFileStorage $storage,
        private readonly KnowledgeCache $cache,
    ) {
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listCategories(bool $activeOnly = false): array
    {
        $query = KnowledgeCategoryAR::find()->orderBy(['sort_order' => SORT_ASC, 'name' => SORT_ASC]);
        if ($activeOnly) {
            $query->andWhere(['is_active' => true]);
        }
        return array_map([$this, 'categoryData'], $query->all());
    }

    /**
     * @param array<string, mixed> $data @return array<string, mixed>
     * @throws ValidationException
     */
    public function createCategory(array $data): array
    {
        $model = new KnowledgeCategoryAR();
        $model->name        = trim((string)($data['name'] ?? ''));
        $model->slug        = strtolower(trim((string)($data['slug'] ?? '')));
        $model->parent_id   = $this->nullableInt($data['parent_id'] ?? null);
        $model->description = $this->nullableString($data['description'] ?? null);
        $model->sort_order  = (int)($data['sort_order'] ?? 0);
        $model->is_active   = (bool)($data['is_active'] ?? true);
        $this->saveModel($model, 'Cannot create category.');
        return $this->categoryData($model);
    }

    /**
     * @param array<string, mixed> $data @return array<string, mixed>
     * @throws EntityNotFoundException
     * @throws ValidationException
     */
    public function updateCategory(int $id, array $data): array
    {
        $model = $this->findCategory($id);
        if (array_key_exists('name', $data)) {
            $model->name = trim((string)$data['name']);
        }
        if (array_key_exists('slug', $data)) {
            $model->slug = strtolower(trim((string)$data['slug']));
        }
        if (array_key_exists('description', $data)) {
            $model->description = $this->nullableString($data['description']);
        }
        if (array_key_exists('parent_id', $data)) {
            $parentId = $this->nullableInt($data['parent_id']);
            if ($parentId === $id || $this->wouldCreateCategoryCycle($id, $parentId)) {
                throw new ValidationException('Category hierarchy cannot contain a cycle.');
            }
            $model->parent_id = $parentId;
        }
        if (array_key_exists('sort_order', $data)) {
            $model->sort_order = (int)$data['sort_order'];
        }
        if (array_key_exists('is_active', $data)) {
            $model->is_active = (bool)$data['is_active'];
        }
        $model->updated_at = date('Y-m-d H:i:s');
        $this->saveModel($model, 'Cannot update category.');
        return $this->categoryData($model);
    }

    /**
     * @throws Throwable
     * @throws StaleObjectException
     * @throws ValidationException
     * @throws EntityNotFoundException
     */
    public function deleteCategory(int $id): void
    {
        $model = $this->findCategory($id);
        $hasChildren = KnowledgeCategoryAR::find()->where(['parent_id' => $id])->exists();
        $hasParts = KnowledgePartAR::find()->where(['category_id' => $id])->exists();
        if ($hasChildren || $hasParts) {
            throw new ValidationException('Category cannot be deleted while it has child categories or knowledge parts.');
        }
        $model->delete();
    }

    /**
     * @param array<string, mixed> $filters
     * @return array{items:array<int,array<string,mixed>>,total:int}
     */
    public function listDocuments(array $filters): array
    {
        $query = KnowledgeDocumentAR::find()->alias('d')->where(['d.deleted_at' => null]);
        if (!empty($filters['status'])) {
            $query->andWhere(['d.status' => (string)$filters['status']]);
        }
        if (!empty($filters['search'])) {
            $needle = trim((string)$filters['search']);
            $query->andWhere(['or', ['ilike', 'd.title', $needle], ['ilike', 'd.original_filename', $needle], ['ilike', 'd.description', $needle]]);
        }
        if (!empty($filters['category_id'])) {
            $query->innerJoin(KnowledgePartAR::tableName() . ' p_filter', 'p_filter.document_id = d.id')
                ->andWhere(['p_filter.category_id' => (int)$filters['category_id']]);
        }
        $total = (int)(clone $query)->distinct()->count();
        $limit = max(1, min(100, (int)($filters['limit'] ?? 20)));
        $offset = max(0, (int)($filters['offset'] ?? 0));
        $rows = $query->select('d.*')->distinct()->orderBy(['d.updated_at' => SORT_DESC])->limit($limit)->offset($offset)->all();
        return ['items' => array_map(fn (KnowledgeDocumentAR $d) => $this->documentData($d, false), $rows), 'total' => $total];
    }

    /**
     * @return array<string, mixed>
     * @throws EntityNotFoundException
     */
    public function getDocument(int $id): array
    {
        $document = $this->findDocument($id);
        $data = $this->documentData($document, true);
        $data['parts'] = array_map([$this, 'partData'], $this->partsForDocument($id));
        return $data;
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     * @throws EntityNotFoundException
     * @throws FileStorageException
     * @throws ValidationException
     */
    public function createDocument(UploadedFile $file, array $data): array
    {
        $stored = $this->storage->saveUploadedFile($file);
        $transaction = Yii::$app->db->beginTransaction();
        try {
            $document = new KnowledgeDocumentAR();
            $document->title                = trim((string)($data['title'] ?? pathinfo($file->name, PATHINFO_FILENAME)));
            $document->description          = $this->nullableString($data['description'] ?? null);
            $document->original_filename    = $this->safeFilename($file->name);
            $document->storage_key          = $stored['storageKey'];
            $document->mime_type            = $stored['mimeType'];
            $document->extension            = $stored['extension'];
            $document->size_bytes           = $stored['size'];
            $document->checksum             = $stored['checksum'];
            $document->revision             = 1;
            $document->status               = (string)($data['status'] ?? 'draft');
            $this->saveModel($document, 'Cannot create document.');

            $categoryId = $this->nullableInt($data['category_id'] ?? null);
            if ($categoryId !== null) {
                $this->findCategory($categoryId);
                $part = new KnowledgePartAR();
                $part->document_id  = (int)$document->id;
                $part->category_id  = $categoryId;
                $part->title        = $document->title;
                $part->locator_type = 'whole_file';
                $part->locator      = '{}';
                $part->save(false);
            }
            $transaction->commit();
        } catch (Throwable $e) {
            $transaction->rollBack();
            $this->storage->delete($stored['storageKey']);
            throw $e;
        }
        return $this->getDocument((int)$document->id);
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     * @throws EntityNotFoundException
     * @throws ValidationException
     */
    public function updateDocument(int $id, array $data): array
    {
        $document = $this->findDocument($id);
        if (array_key_exists('title', $data)) {
            $document->title = trim((string)$data['title']);
        }
        if (array_key_exists('description', $data)) {
            $document->description = $this->nullableString($data['description']);
        }
        if (array_key_exists('status', $data)) {
            $document->status = (string)$data['status'];
        }
        $document->updated_at = date('Y-m-d H:i:s');
        $this->saveModel($document, 'Cannot update document.');
        return $this->getDocument($id);
    }

    /**
     * @return array<string, mixed>
     * @throws EntityNotFoundException
     * @throws FileStorageException
     * @throws ValidationException
     */
    public function replaceDocumentFile(int $id, UploadedFile $file): array
    {
        $document = $this->findDocument($id);
        $stored = $this->storage->saveUploadedFile($file);
        $oldKey = $document->storage_key;
        foreach ($this->partsForDocument($id) as $existingPart) {
            $this->deletePartCache($existingPart);
        }
        try {
            $document->storage_key = $stored['storageKey'];
            $document->original_filename = $this->safeFilename($file->name);
            $document->mime_type = $stored['mimeType'];
            $document->extension = $stored['extension'];
            $document->size_bytes = $stored['size'];
            $document->checksum = $stored['checksum'];
            $document->revision = (int)$document->revision + 1;
            $document->updated_at = date('Y-m-d H:i:s');
            $this->saveModel($document, 'Cannot replace document file.');
        } catch (Throwable $e) {
            $this->storage->delete($stored['storageKey']);
            throw $e;
        }
        $this->storage->delete($oldKey);
        return $this->getDocument($id);
    }

    /**
     * @throws FileStorageException
     * @throws Exception
     * @throws Throwable
     * @throws ValidationException
     * @throws EntityNotFoundException
     */
    public function deleteDocument(int $id): void
    {
        $document = $this->findDocument($id);
        $parts = $this->partsForDocument($id);
        $keys = [$document->storage_key];
        foreach ($parts as $part) {
            $keys[] = $part->content_storage_key;
            $this->deletePartCache($part);
        }
        $transaction = Yii::$app->db->beginTransaction();
        try {
            KnowledgePartAR::deleteAll(['document_id' => $id]);
            $document->deleted_at = date('Y-m-d H:i:s');
            $document->updated_at = date('Y-m-d H:i:s');
            $this->saveModel($document, 'Cannot delete document.');
            $transaction->commit();
        } catch (Throwable $e) {
            $transaction->rollBack();
            throw $e;
        }
        foreach ($keys as $key) {
            $this->storage->delete($key);
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     * @throws EntityNotFoundException
     */
    public function listParts(int $documentId): array
    {
        $this->findDocument($documentId);
        return array_map([$this, 'partData'], $this->partsForDocument($documentId));
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     * @throws EntityNotFoundException
     * @throws FileStorageException
     * @throws ValidationException
     */
    public function createPart(int $documentId, array $data): array
    {
        $document = $this->findDocument($documentId);
        $categoryId = (int)($data['category_id'] ?? 0);
        $this->findCategory($categoryId);
        $locatorType = (string)($data['locator_type'] ?? 'whole_file');
        $locator = is_array($data['locator'] ?? null) ? $data['locator'] : [];
        $hasPartContent = isset($data['content']) && trim((string)$data['content']) !== '';
        $this->validateLocator($locatorType, $locator, $hasPartContent);
        $contentKey = null;
        if ($hasPartContent) {
            $contentKey = $this->storage->saveText((string)$data['content']);
        }
        try {
            $part = new KnowledgePartAR();
            $part->document_id  = $documentId;
            $part->category_id  = $categoryId;
            $part->title        = trim((string)($data['title'] ?? $document->title));
            $part->description  = $this->nullableString($data['description'] ?? null);
            $part->locator_type = $locatorType;
            $part->locator      = json_encode($locator, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $part->content_storage_key = $contentKey;
            $part->sort_order   = (int)($data['sort_order'] ?? 0);
            $this->saveModel($part, 'Cannot create knowledge part.');
        } catch (Throwable $e) {
            $this->storage->delete($contentKey);
            throw $e;
        }
        return $this->partData($part);
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     * @throws EntityNotFoundException
     * @throws FileStorageException
     */
    public function updatePart(int $id, array $data): array
    {
        $part = $this->findPart($id);
        $newContentKey = $part->content_storage_key;
        $oldContentKey = null;
        if (array_key_exists('content', $data)) {
            $newContentKey = trim((string)$data['content']) !== '' ? $this->storage->saveText((string)$data['content']) : null;
            $oldContentKey = $part->content_storage_key;
        }
        $this->deletePartCache($part);
        try {
            if (array_key_exists('category_id', $data)) {
                $this->findCategory((int)$data['category_id']);
                $part->category_id = (int)$data['category_id'];
            }
            if (array_key_exists('title', $data)) {
                $part->title = trim((string)$data['title']);
            }
            if (array_key_exists('description', $data)) {
                $part->description = $this->nullableString($data['description']);
            }
            $type = (string)($data['locator_type'] ?? $part->locator_type);
            $oldLocator = is_array($part->locator) ? $part->locator : (json_decode((string)$part->locator, true) ?: []);
            $locator = is_array($data['locator'] ?? null) ? $data['locator'] : $oldLocator;
            $this->validateLocator($type, $locator, $newContentKey !== null);
            if (array_key_exists('locator_type', $data) || array_key_exists('locator', $data)) {
                $part->locator_type = $type;
                $part->locator = json_encode($locator, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
            if (array_key_exists('content', $data)) {
                $part->content_storage_key = $newContentKey;
            }
            if (array_key_exists('sort_order', $data)) {
                $part->sort_order = (int)$data['sort_order'];
            }
            if (array_key_exists('is_active', $data)) {
                $part->is_active = (bool)$data['is_active'];
            }
            $part->revision = (int)$part->revision + 1;
            $part->updated_at = date('Y-m-d H:i:s');
            $this->saveModel($part, 'Cannot update knowledge part.');
        } catch (Throwable $e) {
            if (array_key_exists('content', $data)) {
                $this->storage->delete($newContentKey);
            }
            throw $e;
        }
        if ($oldContentKey !== null) {
            $this->storage->delete($oldContentKey);
        }
        return $this->partData($part);
    }

    /**
     * @return array<string, mixed>
     * @throws EntityNotFoundException
     */
    public function getPart(int $id): array
    {
        return $this->partData($this->findPart($id));
    }

    /**
     * @throws FileStorageException
     * @throws Throwable
     * @throws StaleObjectException
     * @throws EntityNotFoundException
     */
    public function deletePart(int $id): void
    {
        $part = $this->findPart($id);
        $key = $part->content_storage_key;
        $this->deletePartCache($part);
        $part->delete();
        $this->storage->delete($key);
    }

    /**
     * @param array<int, string> $categorySlugs
     * @return array<int, array<string, mixed>>
     */
    public function retrieve(array $categorySlugs, int $limit = 50): array
    {
        $query = (new Query())
            ->select(['p.*', 'd.title AS document_title', 'd.original_filename', 'd.mime_type', 'd.extension', 'd.revision AS document_revision', 'c.name AS category_name', 'c.slug AS category_slug'])
            ->from(['p' => KnowledgePartAR::tableName()])
            ->innerJoin(['d' => KnowledgeDocumentAR::tableName()], 'd.id = p.document_id')
            ->innerJoin(['c' => KnowledgeCategoryAR::tableName()], 'c.id = p.category_id')
            ->where(['p.is_active' => true, 'd.status' => 'published', 'd.deleted_at' => null, 'c.is_active' => true])
            ->orderBy(['p.sort_order' => SORT_ASC, 'p.id' => SORT_ASC])
            ->limit(max(1, min(100, $limit)));
        if ($categorySlugs !== []) {
            $categoryIds = $this->categoryIdsWithDescendants($categorySlugs);
            $query->andWhere($categoryIds === [] ? '1=0' : ['c.id' => $categoryIds]);
        }

        $items = [];
        foreach ($query->all() as $row) {
            $part = KnowledgePartAR::findOne((int)$row['id']);
            if ($part === null) {
                continue;
            }
            $docRevision = (int)$row['document_revision'];
            $cacheKey = $this->cacheKey($part, $docRevision);
            $content = $this->redisGet($cacheKey);
            if ($content === null && $part->content_storage_key !== null) {
                try {
                    $storedContent = $this->storage->read($part->content_storage_key);
                    if (strlen($storedContent) <= $this->cache->maxEntryBytes()) {
                        $content = $storedContent;
                        $this->redisSet($cacheKey, $content);
                    }
                    // Larger parts are served through contentUrl rather than copied into a Redis response.
                } catch (Throwable $e) {
                    Yii::warning('Could not read cached knowledge part: ' . $e->getMessage(), 'knowledge');
                }
            }

            $locator = is_array($part->locator) ? $part->locator : (json_decode((string)$part->locator, true) ?: []);
            $item = [
                'id'            => (int)$part->id,
                'documentId'    => (int)$part->document_id,
                'categoryId'    => (int)$part->category_id,
                'category'      => ['name' => $row['category_name'], 'slug' => $row['category_slug']],
                'title'         => (string)$part->title,
                'description'   => $part->description,
                'locatorType'   => (string)$part->locator_type,
                'locator'       => $locator,
                'partRevision'  => (int)$part->revision,
                'documentRevision' => $docRevision,
                'filename'      => (string)$row['original_filename'],
                'mimeType'      => (string)$row['mime_type'],
                'extension'     => (string)$row['extension'],
                'documentTitle' => (string)$row['document_title'],
                'contentUrl'    => '/internal/v1/knowledge/parts/' . (int)$part->id . '/content',
                'documentUrl'   => '/internal/v1/knowledge/documents/' . (int)$part->document_id . '/file',
            ];
            if ($content !== null) {
                $item['content'] = $content;
            }
            $items[] = $item;
        }
        return $items;
    }

    /**
     * @throws FileStorageException
     * @throws EntityNotFoundException
     */
    public function readPartContent(int $id): ?string
    {
        $part = $this->findPart($id);
        if ($part->content_storage_key === null) {
            return null;
        }
        return $this->storage->read($part->content_storage_key);
    }

    /**
     * @throws FileStorageException
     * @throws EntityNotFoundException
     */
    public function documentPath(int $id): array
    {
        $document = $this->findDocument($id);
        return ['path' => $this->storage->path($document->storage_key), 'filename' => $document->original_filename, 'mimeType' => $document->mime_type];
    }

    /**
     * @param int $id
     * @param int $documentRevision
     * @param int $partRevision
     * @param string $content
     * @throws EntityNotFoundException
     * @throws ValidationException
     */
    public function cachePartContent(int $id, int $documentRevision, int $partRevision, string $content): void
    {
        $part = $this->findPart($id);
        $document = $this->findDocument((int)$part->document_id);
        if ((int)$document->revision !== $documentRevision || (int)$part->revision !== $partRevision) {
            throw new ValidationException('Document or part revision changed while content was being extracted.');
        }
        $this->redisSet($this->cacheKey($part, $documentRevision), $content);
    }

    /**
     * @return array<string, mixed>
     */
    private function categoryData(KnowledgeCategoryAR $model): array
    {
        return [
            'id'        => (int)$model->id, 'parentId' => $model->parent_id !== null ? (int)$model->parent_id : null,
            'name'      => $model->name, 'slug' => $model->slug, 'description' => $model->description,
            'sortOrder' => (int)$model->sort_order, 'isActive' => (bool)$model->is_active,
            'createdAt' => $model->created_at, 'updatedAt' => $model->updated_at,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function documentData(KnowledgeDocumentAR $model, bool $includeParts): array
    {
        $result = [
            'id'            => (int)$model->id, 'title' => $model->title, 'description' => $model->description,
            'originalFilename' => $model->original_filename, 'mimeType' => $model->mime_type,
            'extension'     => $model->extension, 'sizeBytes' => (int)$model->size_bytes,
            'checksum'      => $model->checksum, 'revision' => (int)$model->revision, 'status' => $model->status,
            'downloadUrl'   => '/admin/knowledge/documents/' . (int)$model->id . '/file',
            'createdAt'     => $model->created_at, 'updatedAt' => $model->updated_at,
        ];
        if ($includeParts) {
            $result['parts'] = array_map([$this, 'partData'], $this->partsForDocument((int)$model->id));
        }
        return $result;
    }

    /**
     * @return array<string, mixed>
     * @throws EntityNotFoundException
     */
    private function partData(KnowledgePartAR $part): array
    {
        $locator = is_array($part->locator) ? $part->locator : (json_decode((string)$part->locator, true) ?: []);
        $category = $this->findCategory((int)$part->category_id);
        return [
            'id'            => (int)$part->id, 'documentId' => (int)$part->document_id,
            'category'      => $this->categoryData($category), 'title' => $part->title, 'description' => $part->description,
            'locatorType'   => $part->locator_type, 'locator' => $locator, 'hasOwnContent' => $part->content_storage_key !== null,
            'revision'      => (int)$part->revision, 'sortOrder' => (int)$part->sort_order, 'isActive' => (bool)$part->is_active,
            'contentUrl'    => '/admin/knowledge/parts/' . (int)$part->id . '/content',
        ];
    }

    /**
     * @throws EntityNotFoundException
     */
    private function findCategory(int $id): KnowledgeCategoryAR
    {
        $model = KnowledgeCategoryAR::findOne($id);
        if ($model === null) {
            throw new EntityNotFoundException('Knowledge category not found.');
        }
        return $model;
    }

    /**
     * @throws EntityNotFoundException
     */
    private function findDocument(int $id): KnowledgeDocumentAR
    {
        $model = KnowledgeDocumentAR::find()->where(['id' => $id, 'deleted_at' => null])->one();
        if ($model === null) {
            throw new EntityNotFoundException('Knowledge document not found.');
        }
        return $model;
    }

    /**
     * @throws EntityNotFoundException
     */
    private function findPart(int $id): KnowledgePartAR
    {
        $model = KnowledgePartAR::findOne($id);
        if ($model === null) {
            throw new EntityNotFoundException('Knowledge part not found.');
        }
        return $model;
    }

    /** @return KnowledgePartAR[] */
    private function partsForDocument(int $documentId): array
    {
        return KnowledgePartAR::find()->where(['document_id' => $documentId])->orderBy(['sort_order' => SORT_ASC, 'id' => SORT_ASC])->all();
    }


    /** @param array<int, string> $slugs @return array<int, int> */
    private function categoryIdsWithDescendants(array $slugs): array
    {
        $roots = KnowledgeCategoryAR::find()
            ->select(['id'])
            ->where(['slug' => $slugs, 'is_active' => true])
            ->column();
        $ids = array_fill_keys(array_map('intval', $roots), true);
        $pending = array_values(array_map('intval', $roots));

        while ($pending !== []) {
            $children = KnowledgeCategoryAR::find()
                ->select(['id'])
                ->where(['parent_id' => $pending, 'is_active' => true])
                ->column();
            $pending = [];
            foreach ($children as $childId) {
                $childId = (int)$childId;
                if (!isset($ids[$childId])) {
                    $ids[$childId] = true;
                    $pending[] = $childId;
                }
            }
        }

        return array_map('intval', array_keys($ids));
    }

    private function wouldCreateCategoryCycle(int $categoryId, ?int $newParentId): bool
    {
        $seen = [$categoryId => true];
        while ($newParentId !== null) {
            if (isset($seen[$newParentId])) {
                return true;
            }
            $seen[$newParentId] = true;
            $parent = KnowledgeCategoryAR::findOne($newParentId);
            if ($parent === null) {
                return false;
            }
            $newParentId = $parent->parent_id !== null ? (int)$parent->parent_id : null;
        }
        return false;
    }

    /**
     * @throws ValidationException
     */
    private function saveModel($model, string $message): void
    {
        if (!$model->save()) {
            throw new ValidationException($message, $model->getErrors());
        }
    }

    /**
     * @throws ValidationException
     */
    private function validateLocator(string $type, array $locator, bool $hasContent): void
    {
        $allowed = ['whole_file', 'heading', 'page_range', 'line_range'];
        if (!in_array($type, $allowed, true)) {
            throw new ValidationException('Unsupported part locator type.');
        }
        if ($type === 'heading' && trim((string)($locator['heading'] ?? '')) === '' && !$hasContent) {
            throw new ValidationException('Heading locator requires locator.heading or explicit part content.');
        }
        if ($type === 'page_range' && (!$hasContent && ((int)($locator['start'] ?? 0) < 1 || (int)($locator['end'] ?? 0) < (int)($locator['start'] ?? 0)))) {
            throw new ValidationException('Page range requires valid start and end values.');
        }
        if ($type === 'line_range' && (!$hasContent && ((int)($locator['start'] ?? 0) < 1 || (int)($locator['end'] ?? 0) < (int)($locator['start'] ?? 0)))) {
            throw new ValidationException('Line range requires valid start and end values.');
        }
    }

    private function safeFilename(string $filename): string
    {
        $filename = basename(str_replace('\\', '/', $filename));
        $filename = preg_replace('/[^\pL\pN._ -]+/u', '_', $filename) ?: 'document';
        return mb_substr($filename, 0, 255);
    }

    private function nullableString(mixed $value): ?string
    {
        if ($value === null || trim((string)$value) === '') {
            return null;
        }
        return trim((string)$value);
    }

    private function nullableInt(mixed $value): ?int
    {
        return $value === null || $value === '' ? null : (int)$value;
    }

    private function cacheKey(KnowledgePartAR $part, int $documentRevision): string
    {
        return sprintf('knowledge:category:%d:part:%d:doc:%d:revision:%d', (int)$part->category_id, (int)$part->id, $documentRevision, (int)$part->revision);
    }

    private function redisGet(string $key): ?string
    {
        return $this->cache->get($key);
    }

    private function redisSet(string $key, string $content): void
    {
        $this->cache->set($key, $content);
    }

    private function deletePartCache(KnowledgePartAR $part): void
    {
        try {
            $document = KnowledgeDocumentAR::findOne((int)$part->document_id);
            if ($document !== null) {
                $this->cache->delete($this->cacheKey($part, (int)$document->revision));
            }
        } catch (Throwable $e) {
            Yii::warning('Knowledge Redis cache invalidation failed: ' . $e->getMessage(), 'knowledge');
        }
    }
}

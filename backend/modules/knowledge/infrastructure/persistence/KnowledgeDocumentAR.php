<?php

declare(strict_types=1);

namespace modules\knowledge\infrastructure\persistence;

use yii\db\ActiveRecord;

/**
 * @property int $id
 * @property string $title
 * @property string|null $description
 * @property string $original_filename
 * @property string $storage_key
 * @property string $mime_type
 * @property string $extension
 * @property int $size_bytes
 * @property string $checksum
 * @property int $revision
 * @property string $status
 * @property string $created_at
 * @property string $updated_at
 * @property string|null $deleted_at
 */
class KnowledgeDocumentAR extends ActiveRecord
{
    public static function tableName(): string
    {
        return '{{%knowledge_document}}';
    }

    public function rules(): array
    {
        return [
            [['title', 'original_filename', 'storage_key', 'mime_type', 'extension', 'checksum'], 'required'],
            [['description'], 'string'], [['size_bytes', 'revision'], 'integer'],
            [['title', 'original_filename'], 'string', 'max' => 255], [['storage_key'], 'string', 'max' => 512],
            [['mime_type'], 'string', 'max' => 150], [['extension', 'status'], 'string', 'max' => 20],
            [['status'], 'in', 'range' => ['draft', 'published', 'archived']],
        ];
    }
}

<?php

declare(strict_types=1);

namespace modules\knowledge\infrastructure\persistence;

use yii\db\ActiveRecord;

/**
 * @property int $id
 * @property int $document_id
 * @property int $category_id
 * @property string $title
 * @property string|null $description
 * @property string $locator_type
 * @property array|string $locator
 * @property string|null $content_storage_key
 * @property int $revision
 * @property int $sort_order
 * @property bool $is_active
 * @property string $created_at
 * @property string $updated_at
 */
class KnowledgePartAR extends ActiveRecord
{
    public static function tableName(): string
    {
        return '{{%knowledge_part}}';
    }

    public function rules(): array
    {
        return [
            [['document_id', 'category_id', 'title'], 'required'],
            [['document_id', 'category_id', 'revision', 'sort_order'], 'integer'],
            [['description'], 'string'], [['locator'], 'safe'], [['is_active'], 'boolean'],
            [['title'], 'string', 'max' => 255],
            [['locator_type'], 'in', 'range' => ['whole_file', 'heading', 'page_range', 'line_range']],
            [['content_storage_key'], 'string', 'max' => 512],
        ];
    }
}

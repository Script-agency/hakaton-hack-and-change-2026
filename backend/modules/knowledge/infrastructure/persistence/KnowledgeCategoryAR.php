<?php

declare(strict_types=1);

namespace modules\knowledge\infrastructure\persistence;

use yii\db\ActiveRecord;

/**
 * @property int $id
 * @property int|null $parent_id
 * @property string $name
 * @property string $slug
 * @property string|null $description
 * @property int $sort_order
 * @property bool $is_active
 * @property string $created_at
 * @property string $updated_at
 */
class KnowledgeCategoryAR extends ActiveRecord
{
    public static function tableName(): string
    {
        return '{{%knowledge_category}}';
    }

    public function rules(): array
    {
        return [
            [['name', 'slug'], 'required'], [['description'], 'string'],
            [['parent_id', 'sort_order'], 'integer'], [['is_active'], 'boolean'],
            [['name'], 'string', 'max' => 150], [['slug'], 'string', 'max' => 180],
            [['slug'], 'match', 'pattern' => '/^[a-z0-9][a-z0-9._-]*$/'], [['slug'], 'unique'],
            [['parent_id'], 'exist', 'targetClass' => self::class, 'targetAttribute' => ['parent_id' => 'id']],
        ];
    }
}

<?php

declare(strict_types=1);

namespace modules\generation\infrastructure\persistence;

use yii\db\ActiveRecord;

/**
 * @property int $id
 * @property int $chat_id
 * @property string $role
 * @property string $content
 * @property string $created_at
 */
class GenerationChatMessageAR extends ActiveRecord
{
    public static function tableName(): string
    {
        return '{{%generation_chat_message}}';
    }
}
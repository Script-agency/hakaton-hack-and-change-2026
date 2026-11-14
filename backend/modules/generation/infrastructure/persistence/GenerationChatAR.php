<?php

declare(strict_types=1);

namespace modules\generation\infrastructure\persistence;

use yii\db\ActiveRecord;

/**
 * @property int $id
 * @property string $fingerprint
 * @property string $created_at
 */
class GenerationChatAR extends ActiveRecord
{
    public static function tableName(): string
    {
        return '{{%generation_chat}}';
    }
}
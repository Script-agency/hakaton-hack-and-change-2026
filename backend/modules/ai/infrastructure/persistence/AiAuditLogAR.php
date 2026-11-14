<?php

declare(strict_types=1);

namespace modules\ai\infrastructure\persistence;

use yii\db\ActiveRecord;

/**
 * @property int $id
 * @property string $call_time
 * @property bool $has_error
 * @property bool $was_sent_to_ai
 * @property string|null $model
 * @property int|null $prompt_tokens
 * @property int|null $completion_tokens
 * @property int|null $total_tokens
 * @property string|null $error_message
 */
class AiAuditLogAR extends ActiveRecord
{
    public static function tableName(): string
    {
        return '{{%ai_audit_log}}';
    }
}
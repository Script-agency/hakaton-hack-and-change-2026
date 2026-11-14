<?php

declare(strict_types=1);

namespace modules\lead\infrastructure\persistence;

use yii\db\ActiveRecord;

/**
 * @property int $id
 * @property string $company
 * @property string $full_name
 * @property string $phone
 * @property string $summary
 * @property array|null $messages
 * @property string $status
 * @property string|null $manager_note
 * @property string $created_at
 * @property string $updated_at
 */
class LeadAR extends ActiveRecord
{
    public static function tableName(): string
    {
        return '{{%lead}}';
    }
}

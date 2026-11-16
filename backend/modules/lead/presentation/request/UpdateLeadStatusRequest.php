<?php

declare(strict_types=1);

namespace modules\lead\presentation\request;

use yii\base\Model;

class UpdateLeadStatusRequest extends Model
{
    public const STATUSES = ['new', 'in_progress', 'closed', 'cancelled'];

    public ?string $status = null;
    public ?string $manager_note = null;

    public function rules(): array
    {
        return [
            ['status', 'required'],
            ['status', 'in', 'range' => self::STATUSES],

            ['manager_note', 'default', 'value' => null],
            ['manager_note', 'string'],
            ['manager_note', 'filter', 'filter' => 'trim'],
        ];
    }

    public function attributeLabels(): array
    {
        return [
            'status'       => 'Статус',
            'manager_note' => 'Заметка менеджера',
        ];
    }
}

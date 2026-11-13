<?php

declare(strict_types=1);

namespace modules\lead\presentation\request;

use yii\base\Model;

class CreateLeadRequest extends Model
{
    public ?string $company     = null;
    public ?string $full_name   = null;
    public ?string $phone       = null;
    public ?string $summary     = null;

    /**
     * История сообщений с AI-агентом.
     * Приходит как массив (JSON body array) либо null.
     *
     * @var array<int, mixed>|null
     */
    public ?array $messages = null;

    public function rules(): array
    {
        return [
            [['company', 'full_name', 'phone', 'summary'], 'required'],

            [['company', 'full_name'], 'string', 'max' => 255],
            [['company', 'full_name'], 'filter', 'filter' => 'trim'],

            ['full_name', 'filter', 'filter' => 'mb_strtolower'],

            ['phone', 'string', 'max' => 20],
            ['phone', 'filter', 'filter' => 'trim'],
            ['phone', 'match', 'pattern' => '/^\+?[0-9\s\-\(\)]{7,20}$/'],

            ['summary', 'string'],

            ['messages', 'default', 'value' => null],
            ['messages', 'validateMessages'],
        ];
    }

    public function validateMessages(string $attribute): void
    {
        if ($this->$attribute === null) {
            return;
        }

        if (!is_array($this->$attribute)) {
            $this->addError($attribute, 'Поле messages должно быть массивом.');
        }
    }

    public function attributeLabels(): array
    {
        return [
            'company'   => 'Компания',
            'full_name' => 'ФИО контактного лица',
            'phone'     => 'Телефон',
            'summary'   => 'Резюме диалога',
            'messages'  => 'История сообщений',
        ];
    }
}

<?php

declare(strict_types=1);

namespace modules\lead\infrastructure\repository;

use core\domain\exception\EntityNotFoundException;
use core\domain\exception\RuntimeException;
use core\domain\exception\ValidationException;
use core\domain\valueObject\Phone;
use Exception;
use modules\lead\infrastructure\persistence\LeadAR;
use DateTimeImmutable;
use modules\lead\application\dto\LeadFiltersDto;
use modules\lead\domain\repository\ILeadRepository;
use modules\lead\domain\entity\Lead;
use modules\lead\domain\enum\LeadStatus;
use modules\lead\domain\valueObject\LeadId;
use Yii;
use yii\db\Exception as DbException;
use yii\db\Query;

class DbLeadRepository implements ILeadRepository
{
    /**
     * @var string[]
     */
    private const ALLOWED_ORDER_COLUMNS = [
        'id', 'company', 'full_name', 'phone', 'status', 'created_at', 'updated_at',
    ];

    /**
     * @throws EntityNotFoundException
     * @throws ValidationException
     */
    public function findById(LeadId $id): Lead
    {
        $row = (new Query())
            ->from(LeadAR::tableName())
            ->where(['id' => $id->value()])
            ->one();

        if (!$row) {
            throw new EntityNotFoundException('Lead not found.');
        }

        return $this->hydrate($row);
    }

    /**
     * @throws EntityNotFoundException
     * @throws ValidationException
     */
    public function findByPhone(Phone $phone): Lead
    {
        $row = (new Query())
            ->from(LeadAR::tableName())
            ->where(['phone' => $phone->value()])
            ->one();

        if (!$row) {
            throw new EntityNotFoundException('Lead not found.');
        }

        return $this->hydrate($row);
    }

    public function existsByPhone(Phone $phone, ?LeadId $excludeLeadId = null): bool
    {
        $query = (new Query())
            ->from(LeadAR::tableName())
            ->where(['phone' => $phone->value()]);

        if ($excludeLeadId !== null) {
            $query->andWhere(['!=', 'id', $excludeLeadId->value()]);
        }

        return $query->exists();
    }

    /**
     * @return Lead[]
     */
    public function findWithFilters(LeadFiltersDto $filters): array
    {
        $query = $this->buildFilterQuery($filters);
        $query->orderBy($this->buildOrderBy($filters->orderBy));
        $query->limit($filters->limit)->offset($filters->offset);

        return array_map([$this, 'hydrate'], $query->all());
    }

    public function countWithFilters(LeadFiltersDto $filters): int
    {
        return (int) $this->buildFilterQuery($filters)->count();
    }

    /**
     * @throws DbException
     * @throws RuntimeException
     * @throws ValidationException
     */
    public function save(Lead $lead): void
    {
        $isNew = $lead->getId()->isNew();

        $ar = $isNew
            ? new LeadAR()
            : LeadAR::findOne(['id' => $lead->getId()->value()]);

        if ($ar === null) {
            throw new RuntimeException(sprintf(
                'Lead with id %d not found for update.',
                $lead->getId()->value(),
            ));
        }

        $ar->company      = $lead->getCompany();
        $ar->full_name    = $lead->getFullName();
        $ar->phone        = $lead->getPhone()->value();
        $ar->summary      = $lead->getSummary();
        $ar->messages     = $lead->getMessages() !== null
            ? json_encode(
                $lead->getMessages(),
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
            )
            : null;
        $ar->status       = $lead->getStatus()->value;
        $ar->manager_note = $lead->getManagerNote();
        $ar->fingerprint = $lead->getFingerprint();
        $ar->conversation_id = $lead->getConversationId();

        $ar->updated_at = $lead->getUpdatedAt()->format('Y-m-d H:i:s');
        if ($isNew) {
            $ar->created_at = $lead->getCreatedAt()->format('Y-m-d H:i:s');
        }

        if (!$ar->save()) {
            throw new RuntimeException(
                'Failed to save lead: '
                . json_encode($ar->getErrors(), JSON_UNESCAPED_UNICODE),
            );
        }

        if ($isNew) {
            $lead->setId(new LeadId((int)$ar->id));
        }
    }

    private function buildOrderBy(?string $orderBy): array
    {
        if ($orderBy === null || trim($orderBy) === '') {
            return ['id' => SORT_ASC];
        }

        if (!preg_match('/^([a-z_]+)(?:\s+(asc|desc))?$/i', trim($orderBy), $m)) {
            return ['id' => SORT_ASC];
        }

        $column = strtolower($m[1]);
        if (!in_array($column, self::ALLOWED_ORDER_COLUMNS, true)) {
            return ['id' => SORT_ASC];
        }

        $direction = isset($m[2]) && strtolower($m[2]) === 'desc' ? SORT_DESC : SORT_ASC;
        return [$column => $direction];
    }

    private function buildFilterQuery(LeadFiltersDto $filters): Query
    {
        $query = (new Query())->from(LeadAR::tableName());

        if (!empty($filters->ids)) {
            $query->andWhere(['id' => $filters->ids]);
        }
        if ($filters->status !== null) {
            $query->andWhere(['status' => $filters->status]);
        }
        if ($filters->company !== null) {
            $query->andWhere(['like', 'company', $filters->company]);
        }
        if ($filters->fullName !== null) {
            $query->andWhere(['like', 'full_name', $filters->fullName]);
        }
        if ($filters->phone !== null) {
            $query->andWhere(['like', 'phone', $filters->phone]);
        }
        if ($filters->createdFrom !== null) {
            $query->andWhere(['>=', 'created_at', $filters->createdFrom]);
        }
        if ($filters->createdTo !== null) {
            $query->andWhere(['<=', 'created_at', $filters->createdTo]);
        }

        return $query;
    }

    /**
     * @throws ValidationException
     * @throws Exception
     */
    private function hydrate(array $row): Lead
    {
        $messages = $this->decodeMessages($row['messages'] ?? null);

        return new Lead(
            new LeadId((int)$row['id']),
            (string)$row['company'],
            (string)$row['full_name'],
            new Phone((string)$row['phone']),
            (string)$row['summary'],
            LeadStatus::from((string)$row['status']),
            $messages,
            $row['manager_note'] !== null ? (string)$row['manager_note'] : null,
            new DateTimeImmutable((string)$row['created_at']),
            new DateTimeImmutable((string)$row['updated_at']),
            isset($row['fingerprint']) ? (string)$row['fingerprint'] : null,
            isset($row['conversation_id']) ? (int)$row['conversation_id'] : null,
        );
    }

    /**
     * TEMP-HACK [#feature-35]: двойное декодирование JSON.
     *
     * ПРИЧИНА. В колонке `lead.messages` исторически лежит дважды
     * закодированный JSON (`"[{\"role\":...}]"`). Источник - старый
     * LeadAR-бихейвиор + ручной json_encode в DbLeadRepository::save()
     * Пока такие строки не вычищены миграцией
     * mXXXXXX_XXXXXX_normalize_lead_messages, читаем «как есть».
     *
     * УДАЛИТЬ КОГДА:
     *   1. Миграция mXXXXXX_XXXXXX_normalize_lead_messages применена на всех env.
     *   2. `SELECT COUNT(*) FROM lead WHERE JSON_TYPE(messages) = 'STRING'` = 0.
     *   3. DbLeadRepository::save() больше не вызывает json_encode дважды.
     *
     * ПОСЛЕ УДАЛЕНИЯ сигнатура должна стать:
     *   private function decodeMessages(mixed $raw): ?array
     *   {
     *       if ($raw === null || $raw === '') return null;
     *       return is_array($raw) ? $raw : json_decode($raw, true) ?: null;
     *   }
     *
     * @internal
     * @deprecated temporary - будет удалён в #feature-35
     * @internal
     * @return array<int, mixed>|null
     */
    private function decodeMessages(mixed $raw): ?array
    {
        if ($raw === null || $raw === '') {
            return null;
        }
        if (is_array($raw)) {
            return $raw;
        }
        if (!is_string($raw)) {
            return null;
        }

        $value = $raw;
        for ($i = 0; $i < 2; $i++) {
            $decoded = json_decode($value, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return null;
            }
            if (is_array($decoded)) {
                return $decoded;
            }
            if (is_string($decoded)) {
                $value = $decoded;
                continue;
            }
            return null;
        }
        return null;
    }
}

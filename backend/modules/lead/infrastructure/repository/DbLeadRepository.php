<?php

declare(strict_types=1);

namespace core\infrastructure\repository;

use core\domain\exception\EntityNotFoundException;
use core\domain\exception\RuntimeException;
use core\domain\exception\ValidationException;
use core\domain\valueObject\Phone;
use Exception;
use modules\lead\infrastructure\persistence\LeadAR;
use DateTimeImmutable;
use modules\lead\application\dto\LeadFiltersDto;
use modules\lead\application\port\ILeadRepository;
use modules\lead\domain\entity\Lead;
use modules\lead\domain\enum\LeadStatus;
use modules\lead\domain\valueObject\LeadId;
use yii\db\Exception as DbException;
use yii\db\Query;

class DbLeadRepository implements ILeadRepository
{
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
        $query->orderBy($filters->orderBy ?? ['id' => SORT_ASC]);
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
        $messages = null;
        if (isset($row['messages']) && $row['messages'] !== '') {
            $decoded  = json_decode((string)$row['messages'], true);
            $messages = is_array($decoded) ? $decoded : null;
        }

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
        );
    }
}

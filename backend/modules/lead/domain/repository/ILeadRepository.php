<?php

declare(strict_types=1);

namespace modules\lead\application\port;

use modules\lead\application\dto\LeadFiltersDto;
use modules\lead\domain\entity\Lead;
use modules\lead\domain\valueObject\LeadId;
use core\domain\valueObject\Phone;
use core\domain\exception\EntityNotFoundException;

interface ILeadRepository
{
    /**
     * @throws EntityNotFoundException
     */
    public function findById(LeadId $id): Lead;

    /**
     * @throws EntityNotFoundException
     */
    public function findByPhone(Phone $phone): Lead;

    /**
     * Проверка уникальности
     */
    public function existsByPhone(Phone $phone, ?LeadId $excludeLeadId = null): bool;

    /**
     * @return Lead[]
     */
    public function findWithFilters(LeadFiltersDto $filters): array;

    public function countWithFilters(LeadFiltersDto $filters): int;

    public function save(Lead $lead): void;
}

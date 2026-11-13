<?php

declare(strict_types=1);

namespace modules\lead\application\dto;

class LeadFiltersDto
{
    public function __construct(
        /** @var int[]|null */
        public ?array $ids          = null,
        public ?int $limit          = null,
        public ?int $offset         = null,
        public ?string $orderBy     = null,
        public ?string $status      = null,
        public ?string $company     = null,
        public ?string $fullName    = null,
        public ?string $phone       = null,
        public ?string $createdFrom = null,
        public ?string $createdTo   = null,
    ) {
    }
}

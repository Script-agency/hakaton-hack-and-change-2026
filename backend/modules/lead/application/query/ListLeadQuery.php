<?php

declare(strict_types=1);

namespace modules\lead\application\query;

use modules\lead\application\dto\LeadFiltersDto;

class ListLeadQuery
{
    public function __construct(public LeadFiltersDto $filters)
    {
    }
}

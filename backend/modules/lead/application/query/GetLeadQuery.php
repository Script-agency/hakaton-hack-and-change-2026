<?php

declare(strict_types=1);

namespace modules\lead\application\query;

class GetLeadQuery
{
    public function __construct(public int $leadId)
    {
    }
}

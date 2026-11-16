<?php

declare(strict_types=1);

namespace modules\lead\domain\enum;

enum LeadStatus: string
{
    case NEW            = "new";
    case IN_PROGRESS    = "in_progress";
    case CLOSED         = "closed";
    case CANCELLED      = "cancelled";
}

<?php

declare(strict_types=1);

namespace modules\lead\application\command;

use modules\lead\domain\enum\LeadStatus;
use modules\lead\domain\valueObject\LeadId;

class UpdateLeadStatusCommand
{
    public function __construct(
        public LeadId $leadId,
        public LeadStatus $status,
        public ?string $managerNote = null,
    ) {
    }
}

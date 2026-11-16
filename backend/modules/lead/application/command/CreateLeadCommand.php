<?php

declare(strict_types=1);

namespace modules\lead\application\command;

use core\domain\valueObject\Phone;

class CreateLeadCommand
{
    /**
     * @param array<int, mixed>|null $messages
     */
    public function __construct(
        public string $company,
        public string $fullName,
        public Phone $phone,
        public string $summary,
        public ?array $messages = null,
        public ?string $fingerprint = null,
        public ?int $conversationId = null,
    ) {
    }
}

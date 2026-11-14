<?php

declare(strict_types=1);

namespace modules\generation\application\dto;

class ChatCreatedDto implements \JsonSerializable
{
    /**
     * @param int $id
     * @param string $fingerprint
     * @param string $created_at
     */
    public function __construct(
        public readonly int $id,
        public readonly string $fingerprint,
        public readonly string $created_at,
    ) {
    }

    public function jsonSerialize(): array
    {
        return [
            'id'          => $this->id,
            'fingerprint' => $this->fingerprint,
            'created_at'  => $this->created_at,
        ];
    }
}
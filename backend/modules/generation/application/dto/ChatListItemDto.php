<?php

declare(strict_types=1);

namespace modules\generation\application\dto;

class ChatListItemDto implements \JsonSerializable
{
    /**
     * @param int $id
     * @param string $fingerprint
     * @param string $created_at
     * @param int $message_count
     */
    public function __construct(
        public readonly int $id,
        public readonly string $fingerprint,
        public readonly string $created_at,
        public readonly int $message_count = 0,
    ) {
    }

    public function jsonSerialize(): array
    {
        return [
            'id'            => $this->id,
            'fingerprint'   => $this->fingerprint,
            'created_at'    => $this->created_at,
            'message_count' => $this->message_count,
        ];
    }
}
<?php

declare(strict_types=1);

namespace modules\generation\application\dto;

class ChatMessageDto implements \JsonSerializable
{
    /**
     * @param int $id
     * @param int $chat_id
     * @param string $role
     * @param string $content
     * @param string $created_at
     * @param array<int, mixed> $sources
     */
    public function __construct(
        public readonly int $id,
        public readonly int $chat_id,
        public readonly string $role,
        public readonly string $content,
        public readonly string $created_at,
        public readonly array $sources = [],
    ) {
    }

    /** @return array<string, mixed> */
    public function jsonSerialize(): array
    {
        return [
            'id'         => $this->id,
            'chat_id'    => $this->chat_id,
            'role'       => $this->role,
            'content'    => $this->content,
            'created_at' => $this->created_at,
            'sources'    => $this->sources,
        ];
    }
}

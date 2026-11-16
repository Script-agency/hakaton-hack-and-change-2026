<?php

declare(strict_types=1);

namespace modules\ai\application\dto;

use JsonSerializable;

class AiResponseDto implements JsonSerializable
{
    /**
     * @param string $content Текст ответа модели
     * @param string $finishReason Причина завершения: stop, length, content_filter, null
     * @param array{prompt_tokens: int, completion_tokens: int, total_tokens: int}|null $usage
     */
    public function __construct(
        public readonly string $content,
        public readonly string $finishReason = 'stop',
        public readonly ?array $usage = null,
    ) {
    }

    public function jsonSerialize(): array
    {
        $result = [
            'content'      => $this->content,
            'finishReason' => $this->finishReason,
        ];

        if ($this->usage !== null) {
            $result['usage'] = $this->usage;
        }

        return $result;
    }
}

<?php

declare(strict_types=1);

namespace modules\ai\application\dto;

class AiRequestDto
{
    /**
     * @param string $systemPrompt Системная инструкция (генеральный промпт)
     * @param array<array{role: string, content: string}> $messages История сообщений / payload запроса
     * @param string|null $modelOverride Модель, если нужно переопределить сохранённую
     */
    public function __construct(
        public readonly string $systemPrompt,
        public readonly array $messages,
        public readonly ?string $modelOverride = null,
    ) {
    }
}

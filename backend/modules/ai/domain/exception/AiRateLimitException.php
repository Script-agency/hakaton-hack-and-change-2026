<?php

declare(strict_types=1);

namespace modules\ai\domain\exception;

use RuntimeException;
use Throwable;

class AiRateLimitException extends RuntimeException
{
    public function __construct(string $message = 'AI rate limit exceeded', int $code = 429, ?Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}

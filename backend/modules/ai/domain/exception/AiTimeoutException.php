<?php

declare(strict_types=1);

namespace modules\ai\domain\exception;

use RuntimeException;
use Throwable;

class AiTimeoutException extends RuntimeException
{
    public function __construct(string $message = 'AI request timed out', int $code = 504, ?Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}

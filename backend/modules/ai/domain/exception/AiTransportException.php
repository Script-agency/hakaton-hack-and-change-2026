<?php

declare(strict_types=1);

namespace modules\ai\domain\exception;

use RuntimeException;
use Throwable;

class AiTransportException extends RuntimeException
{
    public function __construct(string $message = 'AI transport error', int $code = 502, ?Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}

<?php

declare(strict_types=1);

namespace modules\generation\domain\exception;

use RuntimeException;
use Throwable;

class ServiceUnavailableException extends RuntimeException
{
    public function __construct(string $message = 'Service Unavailable', int $code = 503, ?Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}

<?php

declare(strict_types=1);

namespace modules\generation\domain\exception;

use RuntimeException;
use Throwable;

class BadGatewayException extends RuntimeException
{
    public function __construct(string $message = 'Bad Gateway Exception', int $code = 502, ?Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}

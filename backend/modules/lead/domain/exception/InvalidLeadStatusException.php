<?php

declare(strict_types=1);

namespace modules\lead\domain\exception;

use core\domain\exception\DomainException;
use Throwable;

class InvalidLeadStatusException extends DomainException
{
    private array $errors;

    /**
     * @param array<string, array<string>> $errors
     */
    public function __construct(
        string     $message     = 'Invalid lead status exception',
        array      $errors      = [],
        int        $code        = 0,
        ?Throwable $previous    = null,
    ) {
        $this->errors = $errors;
        parent::__construct($message, 400, $code, $previous);
    }

    public function getErrors(): array
    {
        return $this->errors;
    }
}

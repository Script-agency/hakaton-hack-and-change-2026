<?php

declare(strict_types=1);

namespace core\domain\valueObject;

use core\domain\exception\ValidationException;

final class Phone
{
    private string $value;

    /**
     * @throws ValidationException
     */
    public function __construct(string $email)
    {
        $trimmed = trim($email);
        if (strlen($trimmed) > 20) {
            throw new ValidationException('Phone number too long');
        }
        if (!preg_match('/^\+?[\d\s\-\(\)]+$/', $trimmed)) {
            throw new ValidationException('Invalid phone format');
        }
        $this->value = $trimmed;
    }

    public function value(): string
    {
        return $this->value;
    }
}

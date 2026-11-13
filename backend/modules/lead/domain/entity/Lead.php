<?php

declare(strict_types=1);

namespace modules\lead\domain\entity;

use modules\lead\domain\enum\LeadStatus;
use modules\lead\domain\valueObject\LeadId;
use core\domain\exception\ValidationException;
use core\domain\valueObject\Phone;
use DateTimeImmutable;

class Lead
{
    private LeadId $id;
    private string $company;
    private string $fullName;
    private Phone $phone;
    private string $summary;
    /** @var array<int, mixed>|null */
    private ?array $messages;
    private LeadStatus $status;
    private ?string $managerNote;
    private DateTimeImmutable $createdAt;
    private DateTimeImmutable $updatedAt;

    /**
     * @param array<int, mixed>|null $messages
     *
     * @throws ValidationException
     */
    public function __construct(
        LeadId $id,
        string $company,
        string $fullName,
        Phone $phone,
        string $summary,
        LeadStatus $status          = LeadStatus::NEW,
        ?array $messages            = null,
        ?string $managerNote        = null,
        ?DateTimeImmutable $createdAt = null,
        ?DateTimeImmutable $updatedAt = null,
    ) {
        $this->id          = $id;
        $this->company     = $this->validateString($company, 'company', 255);
        $this->fullName    = $this->validateString($fullName, 'full_name', 255);
        $this->phone       = $phone;
        $this->summary     = $this->validateString($summary, 'summary');
        $this->status      = $status;
        $this->messages    = $messages;
        $this->managerNote = $managerNote;
        $this->createdAt   = $createdAt ?? new DateTimeImmutable();
        $this->updatedAt   = $updatedAt ?? new DateTimeImmutable();
    }

    // ---------------------------- Геттеры ----------------------------

    public function getId(): LeadId
    {
        return $this->id;
    }

    public function getCompany(): string
    {
        return $this->company;
    }

    public function getFullName(): string
    {
        return $this->fullName;
    }

    public function getPhone(): Phone
    {
        return $this->phone;
    }

    public function getSummary(): string
    {
        return $this->summary;
    }

    /** @return array<int, mixed>|null */
    public function getMessages(): ?array
    {
        return $this->messages;
    }

    public function getStatus(): LeadStatus
    {
        return $this->status;
    }

    public function getManagerNote(): ?string
    {
        return $this->managerNote;
    }

    public function getCreatedAt(): DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): DateTimeImmutable
    {
        return $this->updatedAt;
    }

    // ---------------------------- Checks ----------------------------

    public function isNew(): bool
    {
        return $this->status === LeadStatus::NEW;
    }

    public function isFinal(): bool
    {
        return in_array($this->status, [LeadStatus::CLOSED, LeadStatus::CANCELLED], true);
    }

    // ---------------------------- Мутаторы ----------------------------

    private function touch(): void
    {
        $this->updatedAt = new DateTimeImmutable();
    }

    /**
     * @throws ValidationException
     */
    public function changeCompany(string $company): void
    {
        $this->company = $this->validateString($company, 'company', 255);
        $this->touch();
    }

    /**
     * @throws ValidationException
     */
    public function changeFullName(string $fullName): void
    {
        $this->fullName = $this->validateString($fullName, 'full_name', 255);
        $this->touch();
    }

    public function changePhone(Phone $phone): void
    {
        $this->phone = $phone;
        $this->touch();
    }

    /**
     * @throws ValidationException
     */
    public function changeSummary(string $summary): void
    {
        $this->summary = $this->validateString($summary, 'summary');
        $this->touch();
    }

    /** @param array<int, mixed>|null $messages */
    public function changeMessages(?array $messages): void
    {
        $this->messages = $messages;
        $this->touch();
    }

    /**
     * @throws ValidationException
     */
    public function changeStatus(LeadStatus $status): void
    {
        if ($this->isFinal() && $status !== $this->status) {
            throw new ValidationException(sprintf(
                'Cannot change status from final state "%s" to "%s".',
                $this->status->value,
                $status->value,
            ));
        }
        $this->status = $status;
        $this->touch();
    }

    public function changeManagerNote(?string $managerNote): void
    {
        $this->managerNote = $managerNote !== null ? trim($managerNote) : null;
        $this->touch();
    }

    /**
     * @internal Используется только репозиторием для установки ID после сохранения
     */
    public function setId(LeadId $id): void
    {
        $this->id = $id;
    }

    // ---------------------------- Helpers ----------------------------

    /**
     * @throws ValidationException
     */
    private function validateString(string $value, string $field, ?int $maxLength = null): string
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            throw new ValidationException(sprintf('Lead %s cannot be empty.', $field));
        }
        if ($maxLength !== null && mb_strlen($trimmed) > $maxLength) {
            throw new ValidationException(sprintf(
                'Lead %s is too long (max %d).',
                $field,
                $maxLength,
            ));
        }
        return $trimmed;
    }
}

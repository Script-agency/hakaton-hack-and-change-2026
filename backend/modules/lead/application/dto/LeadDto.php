<?php

declare(strict_types=1);

namespace modules\lead\application\dto;

use modules\lead\domain\entity\Lead;
use core\infrastructure\persistence\LeadAR;
use JsonSerializable;

class LeadDto implements JsonSerializable
{
    private int $id;
    private string $company;
    private string $fullName;
    private string $phone;
    private string $summary;
    /** @var array<int, mixed>|null */
    private ?array $messages;
    private string $status;
    private ?string $managerNote;
    private string $createdAt;
    private string $updatedAt;

    public function __construct(
        int $id,
        string $company,
        string $fullName,
        string $phone,
        string $summary,
        ?array $messages,
        string $status,
        ?string $managerNote,
        string $createdAt,
        string $updatedAt,
    ) {
        $this->id          = $id;
        $this->company     = $company;
        $this->fullName    = $fullName;
        $this->phone       = $phone;
        $this->summary     = $summary;
        $this->messages    = $messages;
        $this->status      = $status;
        $this->managerNote = $managerNote;
        $this->createdAt   = $createdAt;
        $this->updatedAt   = $updatedAt;
    }

    /**
     * Ожидает, что сущность Lead отдаёт VO через геттеры.
     */
    public static function fromEntity(Lead $lead): self
    {
        return new self(
            $lead->getId()->value(),
            $lead->getCompany(),
            $lead->getFullName(),
            $lead->getPhone()->value(),
            $lead->getSummary(),
            $lead->getMessages(),
            $lead->getStatus()->value(),
            $lead->getManagerNote(),
            $lead->getCreatedAt()->format('Y-m-d H:i:s'),
            $lead->getUpdatedAt()->format('Y-m-d H:i:s'),
        );
    }

    /**
     * Мостик для текущего состояния, пока Lead-сущность не выделена.
     */
    public static function fromAR(LeadAR $ar): self
    {
        return new self(
            (int) $ar->id,
            (string) $ar->company,
            (string) $ar->full_name,
            (string) $ar->phone,
            (string) $ar->summary,
            $ar->messages,
            (string) $ar->status,
            $ar->manager_note,
            (string) $ar->created_at,
            (string) $ar->updated_at,
        );
    }

    public function jsonSerialize(): array
    {
        return [
            'id'          => $this->id,
            'company'     => $this->company,
            'full_name'   => $this->fullName,
            'phone'       => $this->phone,
            'summary'     => $this->summary,
            'messages'    => $this->messages,
            'status'      => $this->status,
            'manager_note' => $this->managerNote,
            'created_at'  => $this->createdAt,
            'updated_at'  => $this->updatedAt,
        ];
    }
}

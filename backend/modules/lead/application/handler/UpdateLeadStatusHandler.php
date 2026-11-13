<?php

declare(strict_types=1);

namespace modules\lead\application\handler;

use core\application\port\ITransactionManager;
use core\domain\exception\EntityNotFoundException;
use core\domain\exception\ValidationException;
use modules\lead\application\command\UpdateLeadStatusCommand;
use modules\lead\application\dto\LeadDto;
use modules\lead\domain\repository\ILeadRepository;

class UpdateLeadStatusHandler
{
    public function __construct(
        private readonly ILeadRepository $leadRepository,
        private readonly ITransactionManager $transactionManager,
    ) {
    }

    /**
     * Логика реализована в формате того, что нельзя стереть заметку,
     * только поставить пустую строку "" при установке в предыдущих итерациях
     *
     * @throws EntityNotFoundException
     * @throws ValidationException
     */
    public function handle(UpdateLeadStatusCommand $command): LeadDto
    {
        $lead = $this->leadRepository->findById($command->leadId);

        $lead->changeStatus($command->status);
        if ($command->managerNote !== null) $lead->changeManagerNote($command->managerNote);

        $this->transactionManager->run(function () use ($lead): void {
            $this->leadRepository->save($lead);
        });

        return LeadDto::fromEntity($lead);
    }
}

<?php

declare(strict_types=1);

namespace modules\lead\application\handler;

use core\application\port\ITransactionManager;
use core\domain\exception\ValidationException;
use modules\lead\application\command\CreateLeadCommand;
use modules\lead\application\dto\LeadDto;
use modules\lead\application\port\ILeadRepository;
use modules\lead\domain\entity\Lead;
use modules\lead\domain\enum\LeadStatus;
use modules\lead\domain\valueObject\LeadId;
use Throwable;

class CreateLeadHandler
{
    public function __construct(
        private readonly ILeadRepository $leadRepository,
        private readonly ITransactionManager $transactionManager,
    ) {
    }

    /**
     * @throws ValidationException
     * @throws Throwable
     */
    public function handle(CreateLeadCommand $command): LeadDto
    {
        $request = $command;

        if ($this->leadRepository->existsByPhone($request->phone)) {
            throw new ValidationException('Phone already exists', ['phone' => ['Phone already exists']]);
        }

        $lead = new Lead(
            new LeadId(0),
            $request->company,
            $request->fullName,
            $request->phone,
            $request->summary,
            LeadStatus::NEW,
            $request->messages,
            "",
        );

        $this->transactionManager->run(function () use ($lead): void {
            $this->leadRepository->save($lead);
        });

        return LeadDto::fromEntity($lead);
    }
}

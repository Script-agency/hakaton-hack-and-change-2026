<?php

declare(strict_types=1);

namespace core\application\handler;

use modules\lead\application\dto\LeadDto;
use modules\lead\application\query\GetLeadQuery;
use core\domain\exception\EntityNotFoundException;
use core\domain\exception\ValidationException;
use modules\lead\domain\valueObject\LeadId;
use modules\lead\application\port\ILeadRepository;

class GetLeadHandler
{
    private ILeadRepository $leadRepository;

    public function __construct(ILeadRepository $leadRepository)
    {
        $this->leadRepository = $leadRepository;
    }

    /**
     * @throws ValidationException
     * @throws EntityNotFoundException
     */
    public function handle(GetLeadQuery $query): LeadDto
    {
        $post = $this->leadRepository->findById(new LeadId($query->leadId));
        return LeadDto::fromEntity($post);
    }
}

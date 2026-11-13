<?php

declare(strict_types=1);

namespace core\application\handler;

use modules\lead\application\dto\LeadDto;
use modules\lead\application\port\ILeadRepository;
use modules\lead\application\query\ListLeadQuery;

class ListLeadHandler
{
    private ILeadRepository $leadRepository;

    public function __construct(ILeadRepository $leadRepository)
    {
        $this->leadRepository = $leadRepository;
    }

    /**
     * @param ListLeadQuery $query
     * @return LeadDto[]
     */
    public function handle(ListLeadQuery $query): array
    {
        $posts = $this->leadRepository->findWithFilters($query->filters);
        return array_map([LeadDto::class, 'fromEntity'], $posts);
    }
}

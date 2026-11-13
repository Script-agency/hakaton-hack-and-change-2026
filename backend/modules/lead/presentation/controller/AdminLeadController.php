<?php

declare(strict_types=1);

namespace modules\lead\presentation\controller;

use core\application\dto\CollectionDto;
use core\application\dto\ItemDto;
use core\domain\exception\EntityNotFoundException;
use core\domain\exception\ValidationException;
use core\presentation\controller\BaseController;
use modules\lead\application\command\UpdateLeadStatusCommand;
use modules\lead\application\dto\LeadFiltersDto;
use modules\lead\application\handler\GetLeadHandler;
use modules\lead\application\handler\ListLeadHandler;
use modules\lead\application\handler\UpdateLeadStatusHandler;
use modules\lead\domain\repository\ILeadRepository;
use modules\lead\application\query\GetLeadQuery;
use modules\lead\application\query\ListLeadQuery;
use modules\lead\domain\enum\LeadStatus;
use modules\lead\domain\valueObject\LeadId;
use modules\lead\presentation\request\UpdateLeadStatusRequest;
use OpenApi\Attributes as OA;
use Yii;
use yii\base\InvalidConfigException;
use yii\di\NotInstantiableException;

#[OA\Tag(
    name: 'admin-leads',
    description: 'Управление лидами (для менеджеров)',
)]
class AdminLeadController extends BaseController
{
    #[OA\Get(
        path: '/admin/leads',
        summary: 'Список лидов с фильтрацией',
        tags: ['admin-leads'],
        parameters: [
            new OA\Parameter(name: 'limit', in: 'query', schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'offset', in: 'query', schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'orderBy', in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(
                name: 'status',
                in: 'query',
                schema: new OA\Schema(
                    type: 'string',
                    enum: ['new', 'in_progress', 'closed', 'cancelled'],
                ),
            ),
            new OA\Parameter(name: 'company', in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'fullName', in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'phone', in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(
                name: 'createdFrom',
                in: 'query',
                schema: new OA\Schema(type: 'string', format: 'date-time'),
            ),
            new OA\Parameter(
                name: 'createdTo',
                in: 'query',
                schema: new OA\Schema(type: 'string', format: 'date-time'),
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Успешно',
                content: new OA\JsonContent(ref: '#/components/schemas/Collection'),
            ),
        ],
    )]
    /**
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     */
    public function actionIndex(): CollectionDto
    {
        $params  = Yii::$app->request->get();
        $filters = new LeadFiltersDto(
            limit:       $this->getLimit(),
            offset:      isset($params['offset']) ? (int)$params['offset'] : null,
            orderBy:     $params['orderBy'] ?? null,
            status:      $params['status'] ?? null,
            company:     $params['company'] ?? null,
            fullName:    $params['fullName'] ?? null,
            phone:       $params['phone'] ?? null,
            createdFrom: $params['createdFrom'] ?? null,
            createdTo:   $params['createdTo'] ?? null,
        );

        $query   = new ListLeadQuery($filters);
        $handler = Yii::$container->get(ListLeadHandler::class);
        $items   = $handler->handle($query);

        $total = Yii::$container->get(ILeadRepository::class)
            ->countWithFilters($filters);

        return $this->collection(
            $items,
            $total,
            $filters->offset ? (int)($filters->offset / ($filters->limit ?: 1)) + 1 : 1,
            $filters->limit,
        );
    }

    #[OA\Get(
        path: '/admin/leads/{id}',
        summary: 'Получение лида по ID',
        tags: ['admin-leads'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer'),
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Успешно',
                content: new OA\JsonContent(ref: '#/components/schemas/Item'),
            ),
            new OA\Response(response: 404, description: 'Лид не найден'),
        ],
    )]
    /**
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     * @throws EntityNotFoundException
     * @throws ValidationException
     */
    public function actionView(int $id): ItemDto
    {
        $query   = new GetLeadQuery($id);
        $handler = Yii::$container->get(GetLeadHandler::class);
        $dto     = $handler->handle($query);

        return $this->item($dto);
    }

    #[OA\Patch(
        path: '/admin/leads/{id}/status',
        summary: 'Изменение статуса лида',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/UpdateLeadStatusRequest'),
        ),
        tags: ['admin-leads'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer'),
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Успешно',
                content: new OA\JsonContent(ref: '#/components/schemas/Item'),
            ),
            new OA\Response(response: 400, description: 'Ошибка валидации'),
            new OA\Response(response: 404, description: 'Лид не найден'),
        ],
    )]
    /**
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     * @throws ValidationException
     * @throws EntityNotFoundException
     */
    public function actionUpdateStatus(int $id): ItemDto
    {
        $request = new UpdateLeadStatusRequest();
        $request->load(Yii::$app->request->getBodyParams(), '');
        if (!$request->validate()) {
            throw new ValidationException('Validation failed: ', $request->getErrors());
        }

        $command = new UpdateLeadStatusCommand(
            leadId:      new LeadId($id),
            status:      LeadStatus::from($request->status),
            managerNote: $request->manager_note,
        );

        $handler = Yii::$container->get(UpdateLeadStatusHandler::class);
        $dto     = $handler->handle($command);

        return $this->item($dto);
    }
}

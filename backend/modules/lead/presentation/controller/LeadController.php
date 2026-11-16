<?php

declare(strict_types=1);

namespace modules\lead\presentation\controller;

use core\application\dto\ItemDto;
use core\domain\exception\ValidationException;
use core\domain\valueObject\Phone;
use core\presentation\controller\BaseController;
use modules\lead\application\command\CreateLeadCommand;
use modules\lead\application\handler\CreateLeadHandler;
use modules\lead\presentation\request\CreateLeadRequest;
use OpenApi\Attributes as OA;
use Throwable;
use TypeError;
use Yii;
use yii\base\InvalidConfigException;
use yii\di\NotInstantiableException;

#[OA\Tag(
    name: 'leads',
    description: 'Приём заявок (лидов) с публичных форм и AI-ассистента',
)]
class LeadController extends BaseController
{
    #[OA\Post(
        path: '/leads',
        description: 'Принимает заявку от публичной формы, AI-ассистента или внешней системы.',
        summary: 'Создание лида (публичный intake)',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/CreateLeadRequest'),
        ),
        tags: ['leads'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Лид создан',
                content: new OA\JsonContent(ref: '#/components/schemas/Item'),
            ),
            new OA\Response(response: 400, description: 'Ошибка валидации'),
        ],
    )]
    /**
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     * @throws ValidationException
     * @throws Throwable
     */
    public function actionCreate(): ItemDto
    {
        $request = new CreateLeadRequest();
        $body = Yii::$app->request->getBodyParams();
        if (array_key_exists('conversation_id', $body)) {
            $conversationId = $body['conversation_id'];
            if ($conversationId === null || (is_string($conversationId) && trim($conversationId) === '')) {
                $body['conversation_id'] = null;
            } elseif (is_int($conversationId) || (is_string($conversationId) && ctype_digit($conversationId))) {
                $body['conversation_id'] = (int)$conversationId;
            }
        }

        try {
            $request->load($body, '');
        } catch (TypeError $e) {
            throw new ValidationException('Invalid request payload', [
                'body' => ['Invalid field types in request body.'],
            ]);
        }

        if (!$request->validate()) {
            throw new ValidationException('Validation failed: ', $request->getErrors());
        }

        $command = new CreateLeadCommand(
            company:  $request->company,
            fullName: $request->full_name,
            phone:    new Phone($request->phone),
            summary:  $request->summary,
            messages: $request->messages,
            fingerprint: $request->fingerprint,
            conversationId: $request->conversation_id,
        );

        $handler = Yii::$container->get(CreateLeadHandler::class);
        $dto     = $handler->handle($command);

        return $this->item($dto);
    }
}

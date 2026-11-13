<?php

declare(strict_types=1);
/**
 * @OA\Schema(
 *     schema="Collection",
 *     required={"items"},
 *     @OA\Property(
 *         property="items",
 *         type="array",
 *         @OA\Items(type="object"),
 *         description="Массив элементов коллекции"
 *     ),
 *     @OA\Property(
 *         property="_meta",
 *         type="object",
 *         description="Мета-информация о пагинации",
 *         @OA\Property(
 *             property="total",
 *             type="integer",
 *             description="Общее количество элементов",
 *             example=100
 *         ),
 *         @OA\Property(
 *             property="page",
 *             type="integer",
 *             description="Текущая страница",
 *             example=1
 *         ),
 *         @OA\Property(
 *             property="limit",
 *             type="integer",
 *             description="Количество элементов на странице",
 *             example=20
 *         ),
 *         @OA\Property(
 *             property="pages",
 *             type="integer",
 *             description="Общее количество страниц",
 *             example=5,
 *             nullable=true
 *         )
 *     )
 * )
 * @OA\Schema(
 *     schema="Item",
 *     @OA\Property(property="item", type="object")
 * )
 * @OA\Schema(
 *     schema="Error",
 *     @OA\Property(property="error", type="object",
 *         @OA\Property(property="code", type="integer"),
 *         @OA\Property(property="message", type="string"),
 *         @OA\Property(property="details", type="object", additionalProperties=true)
 *     )
 * )
 * @OA\Schema(
 *     schema="Success",
 *     @OA\Property(property="message", type="string")
 * )
 */
class MainSchemasDefinitions
{
}

/**
 * @OA\Schema(
 *     schema="CreateLeadRequest",
 *     required={"company", "full_name", "phone", "summary"},
 *     @OA\Property(
 *         property="company",
 *         type="string",
 *         maxLength=255,
 *         description="Название компании",
 *         example="ООО Ромашка"
 *     ),
 *     @OA\Property(
 *         property="full_name",
 *         type="string",
 *         maxLength=255,
 *         description="ФИО контактного лица",
 *         example="Иванов Иван Иванович"
 *     ),
 *     @OA\Property(
 *         property="phone",
 *         type="string",
 *         maxLength=20,
 *         pattern="^\+?[\d\s\-\(\)]+$",
 *         description="Телефон в произвольном формате (валидируется VO Phone)",
 *         example="+7 999 123-45-67"
 *     ),
 *     @OA\Property(
 *         property="summary",
 *         type="string",
 *         description="Резюме диалога с AI-ассистентом",
 *         example="Клиент интересуется внедрением CRM, бюджет 500к, срок - до конца квартала."
 *     ),
 *     @OA\Property(
 *         property="messages",
 *         type="array",
 *         nullable=true,
 *         description="История сообщений с AI-агентом (опционально)",
 *         @OA\Items(
 *             type="object",
 *             additionalProperties=true,
 *             example={"role": "user", "content": "Здравствуйте, хочу узнать про CRM"}
 *         )
 *     )
 * )
 */
class LeadSchemasDefinitions
{
}

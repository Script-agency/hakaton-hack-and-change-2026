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
 * @OA\Schema(
 *     schema="UpdateLeadStatusRequest",
 *     required={"status"},
 *     @OA\Property(
 *         property="status",
 *         type="string",
 *         enum={"new", "in_progress", "closed", "cancelled"},
 *         description="Новый статус лида",
 *         example="in_progress"
 *     ),
 *     @OA\Property(
 *         property="manager_note",
 *         type="string",
 *         nullable=true,
 *         description="Комментарий менеджера (опционально). Не передан - существующая заметка не меняется.",
 *         example="Дозвонились, встреча в четверг в 15:00"
 *     )
 * )
 */
class LeadSchemasDefinitions
{
}

/**
 * @OA\Schema(
 *     schema="KnowledgeCategory",
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", maxLength=255, example="Инструкции"),
 *     @OA\Property(property="slug", type="string", maxLength=255, example="instructions"),
 *     @OA\Property(property="description", type="string", nullable=true, example="Внутренние инструкции и регламенты"),
 *     @OA\Property(property="is_active", type="boolean", example=true),
 *     @OA\Property(property="created_at", type="string", format="date-time", example="2025-01-15T10:00:00+00:00"),
 *     @OA\Property(property="updated_at", type="string", format="date-time", nullable=true, example="2025-01-15T10:00:00+00:00")
 * )
 *
 * @OA\Schema(
 *     schema="CreateKnowledgeCategoryRequest",
 *     required={"name", "slug"},
 *     @OA\Property(property="name", type="string", maxLength=255, example="Инструкции"),
 *     @OA\Property(property="slug", type="string", maxLength=255, pattern="^[a-z0-9\-_]+$", example="instructions"),
 *     @OA\Property(property="description", type="string", nullable=true),
 *     @OA\Property(property="is_active", type="boolean", nullable=true, example=true)
 * )
 *
 * @OA\Schema(
 *     schema="UpdateKnowledgeCategoryRequest",
 *     @OA\Property(property="name", type="string", maxLength=255, nullable=true),
 *     @OA\Property(property="slug", type="string", maxLength=255, nullable=true),
 *     @OA\Property(property="description", type="string", nullable=true),
 *     @OA\Property(property="is_active", type="boolean", nullable=true)
 * )
 *
 * @OA\Schema(
 *     schema="KnowledgeDocument",
 *     @OA\Property(property="id", type="integer", example=42),
 *     @OA\Property(property="category_id", type="integer", nullable=true, example=1),
 *     @OA\Property(property="title", type="string", example="Политика возврата"),
 *     @OA\Property(property="description", type="string", nullable=true),
 *     @OA\Property(property="filename", type="string", example="policy.pdf"),
 *     @OA\Property(property="mime_type", type="string", example="application/pdf"),
 *     @OA\Property(property="size", type="integer", example=204800),
 *     @OA\Property(property="status", type="string", enum={"draft","processing","ready","failed"}, example="ready"),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time", nullable=true)
 * )
 *
 * @OA\Schema(
 *     schema="KnowledgeDocumentList",
 *     @OA\Property(
 *         property="items",
 *         type="array",
 *         @OA\Items(ref="#/components/schemas/KnowledgeDocument")
 *     ),
 *     @OA\Property(
 *         property="_meta",
 *         type="object",
 *         @OA\Property(property="total", type="integer", example=125)
 *     )
 * )
 *
 * @OA\Schema(
 *     schema="UpdateKnowledgeDocumentRequest",
 *     @OA\Property(property="categoryId", type="integer", nullable=true),
 *     @OA\Property(property="title", type="string", maxLength=255, nullable=true),
 *     @OA\Property(property="description", type="string", nullable=true),
 *     @OA\Property(property="status", type="string", enum={"draft","processing","ready","failed"}, nullable=true)
 * )
 *
 * @OA\Schema(
 *     schema="KnowledgePart",
 *     @OA\Property(property="id", type="integer", example=7),
 *     @OA\Property(property="document_id", type="integer", example=42),
 *     @OA\Property(property="title", type="string", nullable=true, example="Раздел 1"),
 *     @OA\Property(property="position", type="integer", example=1),
 *     @OA\Property(property="content", type="string", nullable=true),
 *     @OA\Property(property="revision", type="integer", example=3),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time", nullable=true)
 * )
 *
 * @OA\Schema(
 *     schema="CreateKnowledgePartRequest",
 *     required={"content"},
 *     @OA\Property(property="title", type="string", maxLength=255, nullable=true),
 *     @OA\Property(property="content", type="string"),
 *     @OA\Property(property="position", type="integer", nullable=true, example=1)
 * )
 *
 * @OA\Schema(
 *     schema="UpdateKnowledgePartRequest",
 *     @OA\Property(property="title", type="string", maxLength=255, nullable=true),
 *     @OA\Property(property="content", type="string", nullable=true),
 *     @OA\Property(property="position", type="integer", nullable=true)
 * )
 *
 * @OA\Schema(
 *     schema="RetrieveRequest",
 *     @OA\Property(
 *         property="categorySlugs",
 *         type="array",
 *         nullable=true,
 *         @OA\Items(type="string"),
 *         example={"instructions","faq"}
 *     ),
 *     @OA\Property(property="limit", type="integer", default=50, minimum=1, maximum=500, example=50)
 * )
 *
 * @OA\Schema(
 *     schema="CachePartRequest",
 *     required={"content"},
 *     @OA\Property(property="content", type="string", description="Текст части"),
 *     @OA\Property(property="documentRevision", type="integer", default=0, example=1),
 *     @OA\Property(property="partRevision", type="integer", default=0, example=1)
 * )
 *
 * @OA\Schema(
 *     schema="CachePartResponse",
 *     @OA\Property(property="cached", type="boolean", example=true)
 * )
 */
class KnowledgeSchemasDefinitions
{
}

/**
 * @OA\Schema(
 *     schema="GenerationChatRequest",
 *     required={"question"},
 *     @OA\Property(
 *         property="question",
 *         type="string",
 *         description="Вопрос пользователя (обязательное поле)",
 *         example="Как оформить возврат товара?"
 *     ),
 *     @OA\Property(
 *         property="conversation_id",
 *         type="string",
 *         nullable=true,
 *         description="Идентификатор диалога (пробрасывается в generation-сервис)",
 *         example="conv_01HXYZ"
 *     ),
 *     @OA\Property(
 *         property="context",
 *         type="array",
 *         nullable=true,
 *         description="Дополнительный контекст (пробрасывается в generation-сервис как есть)",
 *         @OA\Items(type="object", additionalProperties=true)
 *     ),
 *     additionalProperties=true,
 *     description="Тело запроса передаётся в generation-сервис без изменений; показаны только известные поля"
 * )
 *
 * @OA\Schema(
 *     schema="ChatCreated",
 *     required={"id", "fingerprint", "created_at"},
 *     @OA\Property(property="id", type="integer", description="ID созданного чата", example=1),
 *     @OA\Property(property="fingerprint", type="string", description="Отпечаток браузера клиента", example="a1b2c3d4e5f6..."),
 *     @OA\Property(property="created_at", type="string", format="date-time", example="2025-01-15T10:00:00+00:00")
 * )
 *
 * @OA\Schema(
 *     schema="ChatListItem",
 *     required={"id", "fingerprint", "created_at", "updated_at"},
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="fingerprint", type="string", example="a1b2c3d4e5f6..."),
 *     @OA\Property(property="title", type="string", nullable=true, description="Заголовок чата (если формируется сервисом)", example="Возврат товара"),
 *     @OA\Property(property="messages_count", type="integer", example=6),
 *     @OA\Property(property="last_message", type="string", nullable=true, description="Превью последнего сообщения", example="Спасибо, всё понятно!"),
 *     @OA\Property(property="created_at", type="string", format="date-time", example="2025-01-15T10:00:00+00:00"),
 *     @OA\Property(property="updated_at", type="string", format="date-time", example="2025-01-15T10:05:00+00:00")
 * )
 *
 * @OA\Schema(
 *     schema="ChatMessage",
 *     required={"id", "role", "content", "created_at"},
 *     @OA\Property(property="id", type="integer", example=42),
 *     @OA\Property(property="role", type="string", enum={"user", "assistant", "system"}, example="user"),
 *     @OA\Property(property="content", type="string", example="Как оформить возврат?"),
 *     @OA\Property(property="created_at", type="string", format="date-time", description="Точное время создания сообщения", example="2025-01-15T10:01:00+00:00")
 * )
 *
 * @OA\Schema(
 *     schema="ChatDetail",
 *     required={"id", "fingerprint", "messages", "created_at"},
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="fingerprint", type="string", example="a1b2c3d4e5f6..."),
 *     @OA\Property(property="title", type="string", nullable=true, example="Возврат товара"),
 *     @OA\Property(
 *         property="messages",
 *         type="array",
 *         description="История сообщений чата, отсортированная по времени",
 *         @OA\Items(ref="#/components/schemas/ChatMessage")
 *     ),
 *     @OA\Property(property="created_at", type="string", format="date-time", example="2025-01-15T10:00:00+00:00"),
 *     @OA\Property(property="updated_at", type="string", format="date-time", nullable=true, example="2025-01-15T10:05:00+00:00")
 * )
 *
 * @OA\Schema(
 *     schema="GenerationChatResponse",
 *     type="object",
 *     additionalProperties=true,
 *     description="Структура ответа определяется generation-сервисом. Пример — типичный ответ LLM.",
 *     example={
 *         "response": "Для оформления возврата обратитесь в службу поддержки...",
 *         "conversation_id": 1,
 *         "usage": {"prompt_tokens": 42, "completion_tokens": 128, "total_tokens": 170}
 *     }
 * )
 */
class GenerationSchemasDefinitions
{
}
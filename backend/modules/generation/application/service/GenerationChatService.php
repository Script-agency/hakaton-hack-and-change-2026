<?php

declare(strict_types=1);

namespace modules\generation\application\service;

use core\domain\exception\EntityNotFoundException;
use modules\generation\application\dto\ChatCreatedDto;
use modules\generation\application\dto\ChatDetailDto;
use modules\generation\application\dto\ChatListItemDto;
use modules\generation\application\dto\ChatMessageDto;
use modules\generation\infrastructure\persistence\GenerationChatAR;
use modules\generation\infrastructure\persistence\GenerationChatMessageAR;
use yii\db\Query;

class GenerationChatService
{
    /**
     * Создаёт новый чат с указанным fingerprint.
     *
     * @param string $fingerprint
     * @return ChatCreatedDto
     */
    public function createChat(string $fingerprint): ChatCreatedDto
    {
        $ar = new GenerationChatAR();
        $ar->fingerprint = $fingerprint;

        if (!$ar->save()) {
            throw new \RuntimeException(
                'Failed to create chat: ' . json_encode($ar->getErrors(), JSON_UNESCAPED_UNICODE),
            );
        }

        return new ChatCreatedDto(
            (int)$ar->id,
            (string)$ar->fingerprint,
            (string)$ar->created_at,
        );
    }

    /**
     * Возвращает список чатов для админов в dev/презентационном режиме.
     *
     * @return ChatListItemDto[]
     */
    public function listAllChats(): array
    {
        $rows = (new Query())
            ->select([
                'c.id',
                'c.fingerprint',
                'c.created_at',
                'c.is_completed',
                'c.summary',
                '(select count(*) from {{%generation_chat_message}} m where m.chat_id = c.id) as message_count',
            ])
            ->from('{{%generation_chat}} c')
            ->orderBy(['c.id' => SORT_DESC])
            ->all();

        return array_map(fn (array $row): ChatListItemDto => $this->mapChatListItem($row), $rows);
    }

    /**
     * Возвращает список чатов по fingerprint (от новых к старым).
     *
     * @param string $fingerprint
     * @return array<int, ChatListItemDto>
     */
    public function listChatsByFingerprint(string $fingerprint): array
    {
        $rows = (new Query())
            ->select([
                'c.id',
                'c.fingerprint',
                'c.created_at',
                'c.is_completed',
                'c.summary',
                '(select count(*) from {{%generation_chat_message}} m where m.chat_id = c.id) as message_count',
            ])
            ->from('{{%generation_chat}} c')
            ->where(['c.fingerprint' => $fingerprint])
            ->orderBy(['c.id' => SORT_DESC])
            ->all();

        return array_map(fn (array $row): ChatListItemDto => $this->mapChatListItem($row), $rows);
    }

    /**
     * Возвращает детали чата со всеми сообщениями, статусом завершения и summary.
     *
     * @param int $chatId
     * @return ChatDetailDto
     * @throws EntityNotFoundException
     */
    public function getChat(int $chatId): ChatDetailDto
    {
        $chat = (new Query())
            ->from(GenerationChatAR::tableName())
            ->where(['id' => $chatId])
            ->one();

        if (!$chat) {
            throw new EntityNotFoundException('Chat not found.');
        }

        $messages = (new Query())
            ->from(GenerationChatMessageAR::tableName())
            ->where(['chat_id' => $chatId])
            ->orderBy(['id' => SORT_ASC])
            ->all();

        $messageDtos = array_map(function (array $row): ChatMessageDto {
            return new ChatMessageDto(
                (int)$row['id'],
                (int)$row['chat_id'],
                (string)$row['role'],
                (string)$row['content'],
                (string)$row['created_at'],
                $this->decodeSources($row['sources'] ?? null),
            );
        }, $messages);

        return new ChatDetailDto(
            (int)$chat['id'],
            (string)$chat['fingerprint'],
            (string)$chat['created_at'],
            $messageDtos,
            $this->toBoolean($chat['is_completed'] ?? false),
            isset($chat['summary']) ? (string)$chat['summary'] : null,
        );
    }

    /**
     * Добавляет сообщение в чат. Для ответа ассистента также сохраняются источники.
     *
     * @param int $chatId
     * @param string $role user|assistant
     * @param string $content
     * @param array<int, mixed> $sources
     * @return ChatMessageDto
     * @throws EntityNotFoundException
     */
    public function addMessage(int $chatId, string $role, string $content, array $sources = []): ChatMessageDto
    {
        $chatExists = (new Query())
            ->from(GenerationChatAR::tableName())
            ->where(['id' => $chatId])
            ->exists();

        if (!$chatExists) {
            throw new EntityNotFoundException('Chat not found.');
        }

        $ar = new GenerationChatMessageAR();
        $ar->chat_id = $chatId;
        $ar->role = $role;
        $ar->content = $content;
        $ar->sources = json_encode(
            array_values($sources),
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR,
        );

        if (!$ar->save()) {
            throw new \RuntimeException(
                'Failed to save message: ' . json_encode($ar->getErrors(), JSON_UNESCAPED_UNICODE),
            );
        }

        return new ChatMessageDto(
            (int)$ar->id,
            (int)$ar->chat_id,
            (string)$ar->role,
            (string)$ar->content,
            (string)$ar->created_at,
            $sources,
        );
    }

    /**
     * Фиксирует передачу диалога консультанту. После этого чат считается закрытым для AI-ответов.
     *
     * @throws EntityNotFoundException
     */
    public function completeChat(int $chatId, string $summary): void
    {
        $summary = trim($summary);
        if ($summary === '') {
            throw new \InvalidArgumentException('Chat summary cannot be empty when completing a chat.');
        }

        $updated = GenerationChatAR::updateAll(
            ['is_completed' => true, 'summary' => $summary],
            ['id' => $chatId],
        );

        if ($updated === 0) {
            throw new EntityNotFoundException('Chat not found.');
        }
    }

    /** @param array<string, mixed> $row */
    private function mapChatListItem(array $row): ChatListItemDto
    {
        return new ChatListItemDto(
            (int)$row['id'],
            (string)$row['fingerprint'],
            (string)$row['created_at'],
            (int)($row['message_count'] ?? 0),
            $this->toBoolean($row['is_completed'] ?? false),
            isset($row['summary']) ? (string)$row['summary'] : null,
        );
    }

    /** @return array<int, mixed> */
    private function decodeSources(mixed $raw): array
    {
        if (is_array($raw)) {
            return array_values($raw);
        }
        if (!is_string($raw) || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? array_values($decoded) : [];
    }

    private function toBoolean(mixed $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }
}

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
use modules\generation\domain\exception\BadGatewayException;
use modules\generation\domain\exception\ServiceUnavailableException;
use Yii;
use yii\db\Query;
use Throwable;

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
                '(select count(*) from {{%generation_chat_message}} m where m.chat_id = c.id) as message_count',
            ])
            ->from('{{%generation_chat}} c')
            ->orderBy(['c.id' => SORT_DESC])
            ->all();

        return array_map(function (array $row): ChatListItemDto {
            return new ChatListItemDto(
                (int)$row['id'],
                (string)$row['fingerprint'],
                (string)$row['created_at'],
                (int)($row['message_count'] ?? 0),
            );
        }, $rows);
    }

    /**
     * Возвращает список чатов по fingerprint (от новых к старым).
     *
     * @param string $fingerprint
     * @return ChatListItemDto[]
     */
    public function listChatsByFingerprint(string $fingerprint): array
    {
        $rows = (new Query())
            ->select([
                'c.id',
                'c.fingerprint',
                'c.created_at',
                '(select count(*) from {{%generation_chat_message}} m where m.chat_id = c.id) as message_count',
            ])
            ->from('{{%generation_chat}} c')
            ->where(['c.fingerprint' => $fingerprint])
            ->orderBy(['c.id' => SORT_DESC])
            ->all();

        return array_map(function (array $row): ChatListItemDto {
            return new ChatListItemDto(
                (int)$row['id'],
                (string)$row['fingerprint'],
                (string)$row['created_at'],
                (int)($row['message_count'] ?? 0),
            );
        }, $rows);
    }

    /**
     * Возвращает детали чата со всеми сообщениями.
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
            );
        }, $messages);

        return new ChatDetailDto(
            (int)$chat['id'],
            (string)$chat['fingerprint'],
            (string)$chat['created_at'],
            $messageDtos,
        );
    }

    /**
     * Добавляет сообщение в чат.
     *
     * @param int $chatId
     * @param string $role user|assistant
     * @param string $content
     * @return ChatMessageDto
     * @throws EntityNotFoundException
     */
    public function addMessage(int $chatId, string $role, string $content): ChatMessageDto
    {
        // Проверяем, что чат существует
        $chat = (new Query())
            ->from(GenerationChatAR::tableName())
            ->where(['id' => $chatId])
            ->one();

        if (!$chat) {
            throw new EntityNotFoundException('Chat not found.');
        }

        $ar = new GenerationChatMessageAR();
        $ar->chat_id = $chatId;
        $ar->role    = $role;
        $ar->content = $content;

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
        );
    }
}
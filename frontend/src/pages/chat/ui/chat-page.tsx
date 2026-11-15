import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";

import { ChatConversation } from "@widgets/chat-conversation";

import { parseChatId } from "@entities/chat/lib";
import { chatQueryOptions } from "@entities/chat/model";

import { useFingerprint } from "@shared/hooks";
import { LoadingState } from "@shared/ui";

import { ChatPageError } from "./chat-page-error";

interface ChatPageProps {
  isActive: boolean;
}

export const ChatPage = ({ isActive }: ChatPageProps) => {
  const { id } = useParams<{ id: string }>();
  const chatId = parseChatId(id);
  const hasInvalidId = id !== undefined && chatId === undefined;
  const fingerprint = useFingerprint(isActive && !hasInvalidId);

  const chat = useQuery({
    ...chatQueryOptions(chatId ?? 0),
    enabled: isActive && chatId !== undefined,
  });

  if (hasInvalidId || fingerprint.isError || (chatId !== undefined && chat.isError)) {
    return (
      <ChatPageError
        chatError={chat.error}
        fingerprintError={fingerprint.error}
        hasInvalidId={hasInvalidId}
        onRetryChat={() => void chat.refetch()}
        onRetryFingerprint={() => void fingerprint.refetch()}
      />
    );
  }

  if (fingerprint.data === undefined || (chatId !== undefined && chat.data === undefined)) {
    return <LoadingState label="Загружаю сообщения…" />;
  }

  return <ChatConversation chat={chat.data} fingerprint={fingerprint.data} isActive={isActive} />;
};

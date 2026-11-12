import { useNavigate, useParams } from "react-router";

import { AssistantHeader } from "@widgets/assistant-header";
import { ChatConversation } from "@widgets/chat-conversation";

import { parseChatId } from "@entities/chat/lib";
import { useChatUi } from "@entities/chat/model";

import styles from "./chat-page.module.scss";

interface ChatPageProps {
  isActive: boolean;
  onBack?: () => void;
}

export const ChatPage = ({ isActive, onBack }: ChatPageProps) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const chatId = parseChatId(id);

  const handleSessionCreated = (sessionId: number) => {
    void navigate(`/chats/${sessionId}`, { replace: true });
  };

  const handleNewDialogClick = () => {
    useChatUi.getState().setDraft("start", "");
    void navigate("/");
  };

  const handleHistoryClick = () => {
    void navigate("/history");
  };

  return (
    <div className={styles.page}>
      <AssistantHeader
        onBackClick={onBack}
        onHistoryClick={handleHistoryClick}
        onNewDialogClick={handleNewDialogClick}
      />
      {id !== undefined && chatId === undefined ? (
        <p className={styles.notFound} role="alert">
          Чат не найден.
        </p>
      ) : (
        <ChatConversation chatId={chatId} isActive={isActive} onSessionCreated={handleSessionCreated} />
      )}
    </div>
  );
};

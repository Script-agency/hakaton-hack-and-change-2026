import { useNavigate } from "react-router";

import { AssistantHeader } from "@widgets/assistant-header";
import { ChatConversation } from "@widgets/chat-conversation";

import { useChat } from "@entities/chat/hooks";

import styles from "./home-page.module.scss";

export const HomePage = () => {
  const navigate = useNavigate();
  const { startNewDialog } = useChat();

  const handleHistoryClick = () => {
    void navigate("/history");
  };

  return (
    <div className={styles.page}>
      <AssistantHeader onHistoryClick={handleHistoryClick} onNewDialogClick={startNewDialog} />
      <ChatConversation />
    </div>
  );
};

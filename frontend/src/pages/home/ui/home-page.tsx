import { AssistantHeader } from "@widgets/assistant-header";
import { ChatConversation } from "@widgets/chat-conversation";

import { useChat } from "@entities/chat/hooks";

import styles from "./home-page.module.scss";

export const HomePage = () => {
  const { startNewDialog } = useChat();

  return (
    <div className={styles.page}>
      <AssistantHeader onNewDialogClick={startNewDialog} />
      <ChatConversation />
    </div>
  );
};

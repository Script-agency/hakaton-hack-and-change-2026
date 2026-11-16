import { Outlet, useNavigate } from "react-router";

import { AssistantHeader } from "@widgets/assistant-header";

import { useChatUi } from "@entities/chat/model";

import styles from "./chat-layout.module.scss";

interface ChatLayoutProps {
  onBack?: () => void;
}

export const ChatLayout = ({ onBack }: ChatLayoutProps) => {
  const navigate = useNavigate();

  const handleNewDialogClick = () => {
    useChatUi.getState().setDraft("start", "");
    void navigate("/");
  };

  const handleHistoryClick = () => {
    void navigate("/history");
  };

  return (
    <div className={styles.layout}>
      <AssistantHeader
        onBackClick={onBack}
        onHistoryClick={handleHistoryClick}
        onNewDialogClick={handleNewDialogClick}
      />
      <Outlet />
    </div>
  );
};

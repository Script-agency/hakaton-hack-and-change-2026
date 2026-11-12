import { Clock, MessageSquare, SquarePlus } from "lucide-react";

import styles from "./assistant-header.module.scss";

interface AssistantHeaderProps {
  onHistoryClick?: () => void;
  onNewDialogClick?: () => void;
}

export const AssistantHeader = ({ onHistoryClick, onNewDialogClick }: AssistantHeaderProps) => {
  return (
    <header className={styles.header}>
      <div aria-hidden="true" className={styles.avatar}>
        <MessageSquare size={22} strokeWidth={2} />
      </div>
      <div className={styles.info}>
        <p className={styles.title}>ИИ-помощник</p>
        <p className={styles.subtitle}>ИИ-ассистент МТС</p>
      </div>
      <button aria-label="История диалогов" className={styles.action} onClick={onHistoryClick} type="button">
        <Clock aria-hidden="true" size={22} strokeWidth={2} />
      </button>
      <button aria-label="Новый диалог" className={styles.action} onClick={onNewDialogClick} type="button">
        <SquarePlus aria-hidden="true" size={22} strokeWidth={2} />
      </button>
    </header>
  );
};

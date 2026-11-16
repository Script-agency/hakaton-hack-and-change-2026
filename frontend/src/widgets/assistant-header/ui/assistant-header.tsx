import { ArrowLeft, Clock, MessageSquare, SquarePlus } from "lucide-react";

import styles from "./assistant-header.module.scss";

interface AssistantHeaderProps {
  onBackClick?: () => void;
  onHistoryClick?: () => void;
  onNewDialogClick?: () => void;
}

export const AssistantHeader = ({ onBackClick, onHistoryClick, onNewDialogClick }: AssistantHeaderProps) => {
  return (
    <header className={styles.header}>
      {onBackClick !== undefined ? (
        <button aria-label="Назад" className={styles.action} onClick={onBackClick} title="Назад" type="button">
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={2} />
        </button>
      ) : (
        <div aria-hidden="true" className={styles.avatar}>
          <MessageSquare size={18} strokeWidth={2} />
        </div>
      )}
      <div className={styles.info}>
        <p className={styles.title}>ИИ-помощник</p>
        <p className={styles.subtitle}>ИИ-ассистент МТС</p>
      </div>

      <button
        aria-label="История диалогов"
        className={styles.action}
        onClick={onHistoryClick}
        title="История диалогов"
        type="button"
      >
        <Clock aria-hidden="true" size={18} strokeWidth={2} />
      </button>

      <button
        aria-label="Новый диалог"
        className={styles.action}
        onClick={onNewDialogClick}
        title="Новый диалог"
        type="button"
      >
        <SquarePlus aria-hidden="true" size={18} strokeWidth={2} />
      </button>
    </header>
  );
};

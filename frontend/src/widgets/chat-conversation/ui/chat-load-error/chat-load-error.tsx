import { Button } from "@shared/ui";

import styles from "./chat-load-error.module.scss";

interface ChatLoadErrorProps {
  onRetry: () => void;
}

export const ChatLoadError = ({ onRetry }: ChatLoadErrorProps) => {
  return (
    <div className={styles.loadError} role="alert">
      <p>Не удалось загрузить сообщения.</p>
      <Button onClick={onRetry}>Повторить</Button>
    </div>
  );
};

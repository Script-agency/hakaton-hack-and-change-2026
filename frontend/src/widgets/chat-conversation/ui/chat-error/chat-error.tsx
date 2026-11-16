import { Collapse } from "@shared/ui";

import styles from "./chat-error.module.scss";

interface ChatErrorProps {
  message?: string;
  hasError: boolean;
}

export const ChatError = ({
  hasError,
  message = "Не удалось получить ответ. Можно отправить новый вопрос.",
}: ChatErrorProps) => {
  return (
    <Collapse isOpen={hasError}>
      <p className={styles.error} role="alert">
        {message}
      </p>
    </Collapse>
  );
};

import { Collapse } from "@shared/ui";

import styles from "./chat-error.module.scss";

interface ChatErrorProps {
  hasError: boolean;
}

export const ChatError = ({ hasError }: ChatErrorProps) => {
  return (
    <Collapse isOpen={hasError}>
      <p className={styles.error} role="alert">
        Не удалось получить ответ. Попробуйте отправить сообщение ещё раз.
      </p>
    </Collapse>
  );
};

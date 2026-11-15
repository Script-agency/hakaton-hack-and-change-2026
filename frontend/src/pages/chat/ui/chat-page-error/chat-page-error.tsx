import { isAxiosError } from "@shared/api";
import { FingerprintError } from "@shared/lib";
import { Button } from "@shared/ui";

import { ChatNotFoundError } from "../../lib";
import styles from "./chat-page-error.module.scss";

interface ChatPageErrorProps {
  hasInvalidId: boolean;
  fingerprintError: unknown;
  chatError: unknown;
  onRetryFingerprint?: () => void;
  onRetryChat?: () => void;
}

const getErrorInfo = (error: unknown) => {
  if (error instanceof ChatNotFoundError || (isAxiosError(error) && error.response?.status === 404)) {
    return { message: "Чат не найден.", canRetry: false };
  }

  if (error instanceof FingerprintError) {
    return { message: "Не удалось определить идентификатор браузера.", canRetry: true };
  }

  if (isAxiosError(error)) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return { message: "Превышено время ожидания загрузки сообщений.", canRetry: true };
    }

    if (error.code === "ERR_NETWORK") {
      return { message: "Не удалось подключиться к серверу. Проверьте соединение с интернетом.", canRetry: true };
    }

    if (error.response !== undefined && error.response.status >= 500) {
      return { message: "Не удалось загрузить сообщения. Сервер временно недоступен.", canRetry: true };
    }
  }

  return { message: "Не удалось загрузить сообщения.", canRetry: true };
};

const getErrorState = ({
  hasInvalidId,
  fingerprintError,
  chatError,
  onRetryFingerprint,
  onRetryChat,
}: ChatPageErrorProps) => {
  if (hasInvalidId) {
    return { error: new ChatNotFoundError(), onRetry: undefined };
  }

  if (fingerprintError !== null && fingerprintError !== undefined) {
    return { error: new FingerprintError(fingerprintError), onRetry: onRetryFingerprint };
  }

  return { error: chatError, onRetry: onRetryChat };
};

export const ChatPageError = (props: ChatPageErrorProps) => {
  const { error, onRetry } = getErrorState(props);
  const { message, canRetry } = getErrorInfo(error);

  return (
    <div className={styles.error} role="alert">
      <p className={styles.message}>{message}</p>
      {canRetry && onRetry !== undefined ? <Button onClick={onRetry}>Повторить</Button> : null}
    </div>
  );
};

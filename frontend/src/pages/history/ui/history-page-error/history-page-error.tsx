import { isAxiosError } from "@shared/api";
import { Button } from "@shared/ui";

import styles from "../history-page-state.module.scss";

interface HistoryPageErrorProps {
  fingerprintError: unknown;
  historyError: unknown;
  onRetryFingerprint?: () => void;
  onRetryHistory?: () => void;
}

const getHistoryErrorMessage = (error: unknown) => {
  if (isAxiosError(error)) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return "Превышено время ожидания загрузки истории диалогов.";
    }

    if (error.code === "ERR_NETWORK") {
      return "Не удалось загрузить историю диалогов. Проверьте соединение с интернетом.";
    }

    if (error.response !== undefined && error.response.status >= 500) {
      return "Не удалось загрузить историю диалогов. Сервер временно недоступен.";
    }
  }

  return "Не удалось загрузить историю диалогов.";
};

const getErrorState = ({
  fingerprintError,
  historyError,
  onRetryFingerprint,
  onRetryHistory,
}: HistoryPageErrorProps) => {
  if (fingerprintError !== null && fingerprintError !== undefined) {
    return { message: "Не удалось определить идентификатор браузера.", onRetry: onRetryFingerprint };
  }

  return { message: getHistoryErrorMessage(historyError), onRetry: onRetryHistory };
};

export const HistoryPageError = (props: HistoryPageErrorProps) => {
  const { message, onRetry } = getErrorState(props);

  return (
    <div className={styles.status} role="alert">
      <p className={styles.message}>{message}</p>
      {onRetry !== undefined ? <Button onClick={onRetry}>Повторить</Button> : null}
    </div>
  );
};

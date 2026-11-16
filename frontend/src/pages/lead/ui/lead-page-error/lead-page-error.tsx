import { useNavigate } from "react-router";

import { isAxiosError } from "@shared/api";
import { Button } from "@shared/ui";

import styles from "./lead-page-error.module.scss";

interface LeadPageErrorProps {
  hasInvalidId: boolean;
  error: unknown;
  onRetry: () => void;
}

export const LeadPageError = ({ hasInvalidId, error, onRetry }: LeadPageErrorProps) => {
  const navigate = useNavigate();
  const isNotFound = hasInvalidId || (isAxiosError(error) && error.response?.status === 404);

  return (
    <div className={styles.error} role="alert">
      <p>{isNotFound ? "Чат не найден." : "Не удалось загрузить переписку для заявки."}</p>
      {!isNotFound ? <Button onClick={onRetry}>Повторить</Button> : null}
      <Button onClick={() => void navigate("/")}>Перейти к переписке</Button>
    </div>
  );
};

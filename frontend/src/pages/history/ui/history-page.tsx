import { useNavigate } from "react-router";

import { useDialogs } from "@entities/dialog/hooks";
import { DialogItem } from "@entities/dialog/ui";

import { Button, LoadingState, PageHeader } from "@shared/ui";

import styles from "./history-page.module.scss";

interface HistoryPageProps {
  isActive: boolean;
  onBack?: () => void;
}

export const HistoryPage = ({ isActive, onBack }: HistoryPageProps) => {
  const navigate = useNavigate();
  const { dialogs, isLoading, hasError, retry } = useDialogs(isActive);

  const handleBack = () => {
    if (onBack !== undefined) {
      onBack();
    } else {
      void navigate("/", { replace: true });
    }
  };

  const isEmpty = !isLoading && !hasError && dialogs.length === 0;

  return (
    <div className={styles.page}>
      <PageHeader onBack={handleBack} title="История диалогов" />

      <div className={styles.content}>
        {isLoading ? <LoadingState label="Загружаю историю…" /> : null}

        {hasError && dialogs.length === 0 ? (
          <div className={styles.status} role="alert">
            <p className={styles.message}>Не удалось загрузить историю диалогов.</p>
            <Button onClick={retry}>Повторить</Button>
          </div>
        ) : null}

        {isEmpty ? <p className={styles.status}>Сохранённых диалогов пока нет.</p> : null}

        {dialogs.length > 0 ? (
          <ul className={styles.list}>
            {dialogs.map((dialog) => (
              <DialogItem key={dialog.id} dialog={dialog} />
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
};

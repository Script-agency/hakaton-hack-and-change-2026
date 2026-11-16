import { useQuery } from "@tanstack/react-query";

import { dialogsQueryOptions } from "@entities/dialog/model";
import { DialogItem } from "@entities/dialog/ui";

import { useFingerprint } from "@shared/hooks";

import { HistoryPageEmpty } from "./history-page-empty";
import { HistoryPageError } from "./history-page-error";
import { HistoryPageLoading } from "./history-page-loading";
import styles from "./history-page.module.scss";

interface HistoryPageProps {
  isActive: boolean;
}

export const HistoryPage = ({ isActive }: HistoryPageProps) => {
  const fingerprint = useFingerprint(isActive);
  const query = useQuery({
    ...dialogsQueryOptions(fingerprint.data ?? ""),
    enabled: isActive && fingerprint.data !== undefined,
  });

  if (fingerprint.isError || query.isError) {
    return (
      <HistoryPageError
        fingerprintError={fingerprint.error}
        historyError={query.error}
        onRetryFingerprint={() => void fingerprint.refetch()}
        onRetryHistory={() => void query.refetch()}
      />
    );
  }

  if (fingerprint.data === undefined || query.data === undefined) {
    return <HistoryPageLoading />;
  }

  if (query.data.length === 0) {
    return <HistoryPageEmpty />;
  }

  return (
    <ul className={styles.list}>
      {query.data.map((dialog) => (
        <DialogItem key={dialog.id} dialog={dialog} />
      ))}
    </ul>
  );
};

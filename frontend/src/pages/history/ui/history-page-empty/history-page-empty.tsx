import styles from "../history-page-state.module.scss";

export const HistoryPageEmpty = () => (
  <p className={styles.status} role="status">
    Сохранённых диалогов пока нет.
  </p>
);

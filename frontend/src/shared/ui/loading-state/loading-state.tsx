import { LoaderCircle } from "lucide-react";

import styles from "./loading-state.module.scss";

interface LoadingStateProps {
  label?: string;
}

export const LoadingState = ({ label = "Загрузка…" }: LoadingStateProps) => (
  <div aria-live="polite" className={styles.loading} role="status">
    <LoaderCircle aria-hidden="true" className={styles.spinner} size={28} strokeWidth={1.75} />
    <span>{label}</span>
  </div>
);

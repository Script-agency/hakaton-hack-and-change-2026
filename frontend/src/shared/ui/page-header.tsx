import { ChevronLeft } from "lucide-react";

import styles from "./page-header.module.scss";

interface PageHeaderProps {
  onBack: () => void;
  title: string;
}

export const PageHeader = ({ onBack, title }: PageHeaderProps) => {
  return (
    <header className={styles.header}>
      <button aria-label="Назад" className={styles.backButton} onClick={onBack} type="button">
        <ChevronLeft aria-hidden="true" size={22} strokeWidth={2} />
      </button>
      <h2 className={styles.title}>{title}</h2>
    </header>
  );
};

import { Outlet, useNavigate } from "react-router";

import { PageHeader } from "@shared/ui";

import styles from "./history-layout.module.scss";

interface HistoryLayoutProps {
  onBack?: () => void;
}

export const HistoryLayout = ({ onBack }: HistoryLayoutProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack !== undefined) {
      onBack();
    } else {
      void navigate("/", { replace: true });
    }
  };

  return (
    <div className={styles.layout}>
      <PageHeader onBack={handleBack} title="История диалогов" />
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
};

import { Outlet, useNavigate } from "react-router";

import { PageHeader } from "@shared/ui";

import styles from "./lead-layout.module.scss";

interface LeadLayoutProps {
  onBack?: () => void;
}

export const LeadLayout = ({ onBack }: LeadLayoutProps) => {
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
      <PageHeader onBack={handleBack} title="Заявка менеджеру" />
      <Outlet />
    </div>
  );
};

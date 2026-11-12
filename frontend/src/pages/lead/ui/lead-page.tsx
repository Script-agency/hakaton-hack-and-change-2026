import { useNavigate } from "react-router";

import { LeadRequestForm } from "@features/lead-request";

import { PageHeader } from "@shared/ui";

import styles from "./lead-page.module.scss";

const previewSummary =
  "Подозревает потери электроэнергии. Объект: склад и офис, около 40 точек учёта. " +
  "Рекомендовано: АСКУЭ Energytool, баланс по вводу.";

interface LeadPageProps {
  onBack?: () => void;
}

export const LeadPage = ({ onBack }: LeadPageProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack !== undefined) {
      onBack();
    } else {
      void navigate("/", { replace: true });
    }
  };

  const handleSubmit = () => {
    void navigate("/lead/sent");
  };

  return (
    <div className={styles.page}>
      <PageHeader onBack={handleBack} title="Заявка менеджеру" />
      <LeadRequestForm onSubmit={handleSubmit} summary={previewSummary} />
    </div>
  );
};

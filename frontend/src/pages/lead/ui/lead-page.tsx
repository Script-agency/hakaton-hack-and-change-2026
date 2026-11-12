import { useNavigate } from "react-router";

import { LeadRequestForm } from "@features/lead-request";

import { PageHeader } from "@shared/ui";

import styles from "./lead-page.module.scss";

const previewSummary =
  "Подозревает потери электроэнергии. Объект: склад и офис, около 40 точек учёта. " +
  "Рекомендовано: АСКУЭ Energytool, баланс по вводу.";

export const LeadPage = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    void navigate("/");
  };

  return (
    <div className={styles.page}>
      <PageHeader onBack={handleBack} title="Заявка менеджеру" />
      <LeadRequestForm summary={previewSummary} />
    </div>
  );
};

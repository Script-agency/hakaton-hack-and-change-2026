import { Check } from "lucide-react";

import styles from "./lead-sent-page.module.scss";

interface LeadSentPageProps {
  onNewChat: () => void;
}

export const LeadSentPage = ({ onNewChat }: LeadSentPageProps) => {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div aria-hidden="true" className={styles.icon}>
          <Check size={36} strokeWidth={2.5} />
        </div>
        <h2 className={styles.title}>Заявка отправлена</h2>
        <p className={styles.description}>Менеджер свяжется с вами в рабочее время. Резюме диалога уже передано.</p>

        <button className={styles.action} onClick={onNewChat} title="Новый чат" type="button">
          Новый чат
        </button>
      </div>
    </div>
  );
};

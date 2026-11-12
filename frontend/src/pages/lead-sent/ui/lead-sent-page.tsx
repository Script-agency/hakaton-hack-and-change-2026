import { Check } from "lucide-react";
import { Link } from "react-router";

import styles from "./lead-sent-page.module.scss";

export const LeadSentPage = () => {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div aria-hidden="true" className={styles.icon}>
          <Check size={36} strokeWidth={2.5} />
        </div>
        <h2 className={styles.title}>Заявка отправлена</h2>
        <p className={styles.description}>Менеджер свяжется с вами в рабочее время. Резюме диалога уже передано.</p>

        <Link className={styles.action} title="Вернуться в чат" to="/">
          Вернуться в чат
        </Link>
      </div>
    </div>
  );
};

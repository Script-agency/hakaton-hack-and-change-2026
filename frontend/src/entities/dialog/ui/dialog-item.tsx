import { Link } from "react-router";

import { formatDialogDate, formatMessageCount } from "../lib";
import type { DialogSummary } from "../types";
import styles from "./dialog-item.module.scss";

interface DialogItemProps {
  dialog: DialogSummary;
}

export const DialogItem = ({ dialog }: DialogItemProps) => (
  <li>
    <Link className={styles.item} replace state={{ screenTransition: "reveal" }} to={`/chats/${dialog.id}`}>
      <div className={styles.top}>
        <h3 className={styles.title}>{dialog.title}</h3>
        <time className={styles.date} dateTime={dialog.createdAt}>
          {formatDialogDate(dialog.createdAt)}
        </time>
      </div>
      <div className={styles.meta}>
        <span className={styles.count}>{formatMessageCount(dialog.messageCount)}</span>
        {dialog.isCompleted ? <span className={styles.count}>Консультация завершена</span> : null}
      </div>
    </Link>
  </li>
);

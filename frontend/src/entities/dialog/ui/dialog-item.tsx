import { Badge, type BadgeTone } from "@shared/ui";

import { formatDialogDate, formatMessageCount } from "../lib";
import { DialogStatus, type DialogSummary } from "../types";
import styles from "./dialog-item.module.scss";

interface DialogItemProps {
  dialog: DialogSummary;
}

const statusBadges: Record<DialogStatus, { label: string; tone: BadgeTone }> = {
  [DialogStatus.Open]: { label: "Без заявки", tone: "neutral" },
  [DialogStatus.LeadSent]: { label: "Заявка отправлена", tone: "success" },
};

export const DialogItem = ({ dialog }: DialogItemProps) => {
  const badge = statusBadges[dialog.status];

  return (
    <li className={styles.item}>
      <div className={styles.top}>
        <h3 className={styles.title}>{dialog.title}</h3>
        <time className={styles.date} dateTime={dialog.updatedAt}>
          {formatDialogDate(dialog.updatedAt)}
        </time>
      </div>
      <p className={styles.preview}>{dialog.preview}</p>
      <div className={styles.meta}>
        <Badge tone={badge.tone}>{badge.label}</Badge>
        <span className={styles.count}>{formatMessageCount(dialog.messageCount)}</span>
      </div>
    </li>
  );
};

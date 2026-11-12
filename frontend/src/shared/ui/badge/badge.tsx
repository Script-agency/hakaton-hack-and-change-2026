import type { PropsWithChildren } from "react";
import clsx from "clsx";

import styles from "./badge.module.scss";

export type BadgeTone = "neutral" | "success";

interface BadgeProps extends PropsWithChildren {
  tone?: BadgeTone;
}

export const Badge = ({ children, tone = "neutral" }: BadgeProps) => {
  return <span className={clsx(styles.badge, styles[tone])}>{children}</span>;
};

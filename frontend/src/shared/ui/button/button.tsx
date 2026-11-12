import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

import styles from "./button.module.scss";

export const Button = ({
  className,
  title,
  type = "button",
  ...buttonProps
}: ButtonHTMLAttributes<HTMLButtonElement>) => {
  const label =
    title ?? buttonProps["aria-label"] ?? (typeof buttonProps.children === "string" ? buttonProps.children : undefined);

  return <button {...buttonProps} className={clsx(styles.button, className)} title={label} type={type} />;
};

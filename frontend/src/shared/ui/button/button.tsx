import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

import styles from "./button.module.scss";

export const Button = ({ className, type = "button", ...buttonProps }: ButtonHTMLAttributes<HTMLButtonElement>) => {
  return <button {...buttonProps} className={clsx(styles.button, className)} type={type} />;
};

import { useId, type InputHTMLAttributes } from "react";
import clsx from "clsx";

import { Collapse } from "../collapse";
import styles from "./text-field.module.scss";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label: string;
}

export const TextField = ({ error, id, label, ...inputProps }: TextFieldProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hasError = error !== undefined;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <input
        {...inputProps}
        aria-describedby={hasError ? errorId : undefined}
        aria-invalid={hasError}
        className={clsx(styles.input, hasError && styles.inputError)}
        id={inputId}
      />
      <Collapse isOpen={hasError}>
        <p className={styles.error} id={errorId} role="alert">
          {error}
        </p>
      </Collapse>
    </div>
  );
};

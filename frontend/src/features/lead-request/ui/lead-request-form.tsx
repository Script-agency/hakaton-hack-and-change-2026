import { useState, type ChangeEvent, type FormEvent } from "react";

import { Button, TextField } from "@shared/ui";

import { formatPhone, validateLeadRequest } from "../lib";
import type { LeadRequestValues } from "../types";
import styles from "./lead-request-form.module.scss";

interface LeadRequestFormProps {
  onSubmit?: (values: LeadRequestValues) => void;
  summary: string;
}

type TouchedFields = Partial<Record<keyof LeadRequestValues, boolean>>;

const initialValues: LeadRequestValues = {
  company: "",
  fullName: "",
  phone: "",
};

export const LeadRequestForm = ({ onSubmit, summary }: LeadRequestFormProps) => {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState<TouchedFields>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const errors = validateLeadRequest(values);

  const getError = (field: keyof LeadRequestValues) => {
    return isSubmitted || touched[field] === true ? errors[field] : undefined;
  };

  const handleChange = (field: keyof LeadRequestValues) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = field === "phone" ? formatPhone(event.target.value) : event.target.value;

    setValues((previous) => ({ ...previous, [field]: value }));
  };

  const handleBlur = (field: keyof LeadRequestValues) => () => {
    setTouched((previous) => ({ ...previous, [field]: true }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitted(true);

    if (Object.keys(errors).length > 0) {
      return;
    }

    onSubmit?.({
      company: values.company.trim(),
      fullName: values.fullName.trim(),
      phone: values.phone,
    });
  };

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit}>
      <div className={styles.body}>
        <p className={styles.intro}>Оставьте контакты — менеджер свяжется с вами и уже будет знать суть разговора.</p>
        <TextField
          autoComplete="name"
          error={getError("fullName")}
          label="ФИО"
          name="fullName"
          onBlur={handleBlur("fullName")}
          onChange={handleChange("fullName")}
          placeholder="Иванов Иван Иванович"
          value={values.fullName}
        />
        <TextField
          autoComplete="tel"
          error={getError("phone")}
          inputMode="tel"
          label="Телефон"
          name="phone"
          onBlur={handleBlur("phone")}
          onChange={handleChange("phone")}
          placeholder="+7 (900) 000-00-00"
          type="tel"
          value={values.phone}
        />
        <TextField
          autoComplete="organization"
          error={getError("company")}
          label="Компания"
          name="company"
          onBlur={handleBlur("company")}
          onChange={handleChange("company")}
          placeholder="ООО «Пример»"
          value={values.company}
        />
        <span className={styles.summaryLabel}>Резюме для менеджера</span>
        <p className={styles.summary}>{summary}</p>
      </div>
      <div className={styles.footer}>
        <Button className={styles.submit} type="submit">
          Отправить заявку
        </Button>
      </div>
    </form>
  );
};

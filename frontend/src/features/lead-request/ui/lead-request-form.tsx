import type { CreateLeadRequest } from "@entities/lead/types";

import { Button, TextField } from "@shared/ui";

import { useLeadRequest } from "../hooks";
import styles from "./lead-request-form.module.scss";

interface LeadRequestFormProps {
  conversation: Pick<CreateLeadRequest, "conversationId" | "fingerprint" | "summary">;
  isActive: boolean;
  onSuccess: () => void;
}

export const LeadRequestForm = ({ conversation, isActive, onSuccess }: LeadRequestFormProps) => {
  const { values, getError, handleChange, handleBlur, handleSubmit, isPending, errorMessage } = useLeadRequest({
    conversation,
    isActive,
    onSuccess,
  });

  return (
    <form
      aria-busy={isPending}
      aria-label="Заявка менеджеру"
      className={styles.form}
      noValidate
      onSubmit={handleSubmit}
    >
      <div className={styles.body}>
        <p className={styles.intro}>Оставьте контакты — менеджер свяжется с вами и уже будет знать суть разговора.</p>
        <TextField
          autoComplete="name"
          disabled={!isActive || isPending}
          error={getError("fullName")}
          label="ФИО"
          maxLength={255}
          name="fullName"
          onBlur={handleBlur("fullName")}
          onChange={handleChange("fullName")}
          placeholder="Иванов Иван Иванович"
          value={values.fullName}
        />
        <TextField
          autoComplete="tel"
          disabled={!isActive || isPending}
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
          disabled={!isActive || isPending}
          error={getError("company")}
          label="Компания"
          maxLength={255}
          name="company"
          onBlur={handleBlur("company")}
          onChange={handleChange("company")}
          placeholder="ООО «Пример»"
          value={values.company}
        />
        {errorMessage !== undefined ? (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>
      <div className={styles.footer}>
        <Button className={styles.submit} disabled={!isActive || isPending} type="submit">
          {isPending ? "Отправляю заявку…" : "Отправить заявку"}
        </Button>
      </div>
    </form>
  );
};

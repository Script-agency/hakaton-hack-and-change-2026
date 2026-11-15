import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { useCreateLead } from "@entities/lead/hooks";
import { beginLeadRequest } from "@entities/lead/model";
import type { LeadMessage } from "@entities/lead/types";

import { formatPhone, getLeadRequestError, validateLeadRequest } from "../lib";
import type { LeadRequestValues } from "../types";

interface UseLeadRequestOptions {
  messages: LeadMessage[];
  isActive: boolean;
  onSuccess: () => void;
}

const initialValues: LeadRequestValues = { company: "", fullName: "", phone: "" };

export const useLeadRequest = ({ messages, isActive, onSuccess }: UseLeadRequestOptions) => {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState<Partial<Record<keyof LeadRequestValues, boolean>>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const mutation = useCreateLead();
  const errors = validateLeadRequest(values);
  const submitError = getLeadRequestError(mutation.error);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [isActive]
  );

  useEffect(() => {
    if (isActive && mutation.isSuccess && mutation.variables.controller.signal.aborted !== true) {
      onSuccess();
    }
  }, [isActive, mutation.isSuccess, mutation.variables, onSuccess]);

  const getError = (field: keyof LeadRequestValues) => {
    if (submitError.fieldErrors[field] !== undefined) {
      return submitError.fieldErrors[field];
    }

    return isSubmitted || touched[field] === true ? errors[field] : undefined;
  };

  const handleChange = (field: keyof LeadRequestValues) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = field === "phone" ? formatPhone(event.target.value) : event.target.value;

    if (mutation.isError) {
      mutation.reset();
    }

    setValues((previous) => ({ ...previous, [field]: value }));
  };

  const handleBlur = (field: keyof LeadRequestValues) => () => {
    setTouched((previous) => ({ ...previous, [field]: true }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitted(true);

    if (!isActive || mutation.isPending || Object.keys(errors).length > 0) {
      return;
    }

    const controller = beginLeadRequest();

    if (controller === undefined) {
      return;
    }

    controllerRef.current = controller;
    mutation.mutate({ request: { ...values, summary: "", messages }, controller });
  };

  return {
    values,
    getError,
    handleChange,
    handleBlur,
    handleSubmit,
    isPending: mutation.isPending,
    errorMessage: submitError.message,
  };
};

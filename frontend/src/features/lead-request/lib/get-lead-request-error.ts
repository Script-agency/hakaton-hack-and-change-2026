import { adapterLeadFieldErrorsFromDto } from "@entities/lead/lib";
import type { LeadErrorResponseDto, LeadFieldErrors } from "@entities/lead/types";

import { isAxiosError } from "@shared/api";

export const getLeadRequestError = (error: unknown): { message?: string; fieldErrors: LeadFieldErrors } => {
  if (error === null || error === undefined || (isAxiosError(error) && error.code === "ERR_CANCELED")) {
    return { fieldErrors: {} };
  }

  if (isAxiosError<LeadErrorResponseDto>(error)) {
    const fieldErrors = adapterLeadFieldErrorsFromDto(error.response?.data);

    if (Object.values(fieldErrors).some((message) => message !== undefined)) {
      return { message: "Проверьте данные заявки.", fieldErrors };
    }

    if (error.code === "ERR_NETWORK") {
      return { message: "Не удалось отправить заявку. Проверьте соединение с интернетом.", fieldErrors };
    }

    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return { message: "Сервер не ответил вовремя. Попробуйте позже.", fieldErrors };
    }
  }

  return { message: "Не удалось отправить заявку. Попробуйте ещё раз.", fieldErrors: {} };
};

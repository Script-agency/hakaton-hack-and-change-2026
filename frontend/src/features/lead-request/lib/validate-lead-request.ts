import type { LeadRequestErrors, LeadRequestValues } from "../types";
import { isPhoneComplete } from "./format-phone";

const minFullNameParts = 2;

export const validateLeadRequest = ({ company, fullName, phone }: LeadRequestValues) => {
  const errors: LeadRequestErrors = {};
  const trimmedFullName = fullName.trim();

  if (trimmedFullName.length === 0) {
    errors.fullName = "Укажите ФИО";
  } else if (trimmedFullName.split(/\s+/).length < minFullNameParts) {
    errors.fullName = "Укажите фамилию и имя";
  } else if (trimmedFullName.length > 255) {
    errors.fullName = "ФИО должно содержать не более 255 символов";
  }

  if (phone.length === 0) {
    errors.phone = "Укажите телефон";
  } else if (!isPhoneComplete(phone)) {
    errors.phone = "Введите номер полностью";
  }

  if (company.trim().length === 0) {
    errors.company = "Укажите компанию";
  } else if (company.trim().length > 255) {
    errors.company = "Компания должна содержать не более 255 символов";
  }

  return errors;
};

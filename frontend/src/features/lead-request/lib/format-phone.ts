const nationalDigitsLimit = 10;

export const getNationalDigits = (value: string) => {
  const digits = value.replace(/\D/g, "");
  const national = digits.startsWith("7") || digits.startsWith("8") ? digits.slice(1) : digits;

  return national.slice(0, nationalDigitsLimit);
};

export const isPhoneComplete = (value: string) => {
  return getNationalDigits(value).length === nationalDigitsLimit;
};

export const formatPhone = (value: string) => {
  const national = getNationalDigits(value);

  if (national.length === 0) {
    return "";
  }

  let formatted = `+7 (${national.slice(0, 3)}`;

  if (national.length > 3) {
    formatted += `) ${national.slice(3, 6)}`;
  }

  if (national.length > 6) {
    formatted += `-${national.slice(6, 8)}`;
  }

  if (national.length > 8) {
    formatted += `-${national.slice(8, 10)}`;
  }

  return formatted;
};

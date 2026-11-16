import { format, isToday, isYesterday } from "date-fns";
import { ru } from "date-fns/locale/ru";

export const formatDialogDate = (value: string) => {
  const date = new Date(value);

  if (isToday(date)) {
    return format(date, "HH:mm");
  }

  if (isYesterday(date)) {
    return "Вчера";
  }

  return format(date, "d MMM", { locale: ru });
};

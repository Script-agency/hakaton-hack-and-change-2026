import { subDays, subMinutes } from "date-fns";

import { DialogStatus, type DialogSummary } from "../types";

const createDialogs = (): DialogSummary[] => {
  const now = new Date();

  return [
    {
      id: "dialog-warehouse-losses",
      title: "Потери электроэнергии на складе",
      preview: "Рекомендовано: АСКУЭ Energytool, баланс по вводу.",
      updatedAt: subMinutes(now, 25).toISOString(),
      messageCount: 6,
      status: DialogStatus.LeadSent,
    },
    {
      id: "dialog-cooperative-metering",
      title: "Учёт электроэнергии в СНТ",
      preview: "Для СНТ можно организовать автоматический сбор показаний и контроль баланса.",
      updatedAt: subDays(now, 1).toISOString(),
      messageCount: 4,
      status: DialogStatus.Open,
    },
    {
      id: "dialog-growing-bills",
      title: "Счета за электричество выросли",
      preview: "Подскажите, какой у вас объект: офис, производство или посёлок?",
      updatedAt: subDays(now, 3).toISOString(),
      messageCount: 2,
      status: DialogStatus.Open,
    },
    {
      id: "dialog-office-meters",
      title: "Подбор счётчиков для офиса",
      preview: "Для офиса подойдут счётчики с удалённым сбором показаний и разбивкой по этажам.",
      updatedAt: subDays(now, 9).toISOString(),
      messageCount: 8,
      status: DialogStatus.LeadSent,
    },
  ];
};

class _DialogMockService {
  getDialogs = (signal: AbortSignal): Promise<DialogSummary[]> => {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException("Request aborted", "AbortError"));

        return;
      }

      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException("Request aborted", "AbortError"));
      };

      const timer = setTimeout(() => {
        signal.removeEventListener("abort", abort);
        resolve(createDialogs());
      }, 400);

      signal.addEventListener("abort", abort, { once: true });
    });
  };
}

export const DialogMockService = new _DialogMockService();

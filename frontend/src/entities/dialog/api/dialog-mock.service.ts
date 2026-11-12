import { subMinutes } from "date-fns";

import { demoDialogs, mockDialogHistory } from "@shared/lib";

import { DialogStatus, type DialogSummary } from "../types";

const createDialogs = (): DialogSummary[] => {
  const now = new Date();

  const demos = demoDialogs.map((dialog) => ({
    id: dialog.id,
    title: dialog.title,
    preview: dialog.turns[dialog.turns.length - 1][1],
    updatedAt: subMinutes(now, dialog.ageMinutes).toISOString(),
    messageCount: dialog.turns.length * 2,
    status: dialog.leadSent ? DialogStatus.LeadSent : DialogStatus.Open,
  }));

  const records = mockDialogHistory.list();

  const updatedIds = new Set(records.map((record) => record.id));

  return [
    ...records.map((record) => ({
      ...record,
      status: demos.find((dialog) => dialog.id === record.id)?.status ?? DialogStatus.Open,
    })),
    ...demos.filter((dialog) => !updatedIds.has(dialog.id)),
  ].sort((first, second) => Date.parse(second.updatedAt) - Date.parse(first.updatedAt));
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

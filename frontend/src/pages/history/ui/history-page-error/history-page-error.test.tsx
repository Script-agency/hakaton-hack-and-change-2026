import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { expect, test, vi } from "vitest";

import { HistoryPageEmpty } from "../history-page-empty";
import { HistoryPageLoading } from "../history-page-loading";
import { HistoryPageError } from "./history-page-error";

type Props = ComponentProps<typeof HistoryPageError>;

const show = (props: Partial<Props>) =>
  render(<HistoryPageError fingerprintError={null} historyError={null} {...props} />);

test.each([
  [new AxiosError("Offline", "ERR_NETWORK"), /соединение с интернетом/],
  [new AxiosError("Timeout", "ECONNABORTED"), /время ожидания/],
  [new AxiosError("Timeout", "ETIMEDOUT"), /время ожидания/],
  [
    new AxiosError("Server", "ERR_BAD_RESPONSE", undefined, undefined, {
      status: 503,
      statusText: "Error",
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: null,
    }),
    /Сервер временно недоступен/,
  ],
])("history distinguishes errors: %s", (historyError, message) => {
  show({ historyError, onRetryHistory: vi.fn() });
  expect(screen.getByRole("alert")).toHaveTextContent(message);
  expect(screen.getByRole("button", { name: "Повторить" })).toBeVisible();
});

test("fingerprint errors take priority and select their own retry", () => {
  const fingerprint = vi.fn();
  const history = vi.fn();
  const view = show({
    fingerprintError: new Error(),
    historyError: new Error(),
    onRetryFingerprint: fingerprint,
    onRetryHistory: history,
  });
  expect(screen.getByRole("alert")).toHaveTextContent("идентификатор браузера");
  screen.getByRole("button").click();
  expect(fingerprint).toHaveBeenCalledOnce();
  expect(history).not.toHaveBeenCalled();
  view.rerender(<HistoryPageError fingerprintError={null} historyError={new Error()} onRetryHistory={history} />);
  screen.getByRole("button").click();
  expect(history).toHaveBeenCalledOnce();
});

test("unknown errors hide technical details and retry remains optional", () => {
  show({ historyError: new Error("private detail") });
  expect(screen.getByRole("alert")).toHaveTextContent("Не удалось загрузить историю диалогов");
  expect(screen.getByRole("alert")).not.toHaveTextContent("private detail");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("empty and loading history have distinct accessible states", () => {
  const view = render(<HistoryPageEmpty />);
  expect(screen.getByRole("status")).toHaveTextContent("Сохранённых диалогов пока нет");
  view.rerender(<HistoryPageLoading />);
  expect(screen.getByRole("status")).toHaveTextContent("Загружаю историю");
  expect(screen.getByRole("status")).not.toHaveTextContent("Сохранённых диалогов");
});

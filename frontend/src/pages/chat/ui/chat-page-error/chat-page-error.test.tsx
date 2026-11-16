import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { expect, test, vi } from "vitest";

import { FingerprintError } from "@shared/lib";

import { ChatNotFoundError } from "../../lib";
import { ChatPageError } from "./chat-page-error";

type Props = ComponentProps<typeof ChatPageError>;

const httpError = (status: number) =>
  new AxiosError("Request failed", "ERR_BAD_RESPONSE", undefined, undefined, {
    status,
    statusText: "Error",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: null,
  });

const show = (props: Partial<Props>) =>
  render(<ChatPageError chatError={null} fingerprintError={null} hasInvalidId={false} {...props} />);

test.each([
  [httpError(500), /Сервер временно недоступен/],
  [httpError(503), /Сервер временно недоступен/],
  [new AxiosError("Offline", "ERR_NETWORK"), /соединение с интернетом/],
  [new AxiosError("Timeout", "ECONNABORTED"), /время ожидания/],
  [new AxiosError("Timeout", "ETIMEDOUT"), /время ожидания/],
  [new FingerprintError(new Error("Unavailable")), /идентификатор браузера/],
])("recognizes request error %s", (chatError, message) => {
  show({ chatError, onRetryChat: vi.fn() });
  expect(screen.getByRole("alert")).toHaveTextContent(message);
  expect(screen.getByRole("button", { name: "Повторить" })).toBeVisible();
});

test.each([new ChatNotFoundError(), httpError(404)])("missing chats have no retry: %s", (chatError) => {
  show({ chatError, onRetryChat: vi.fn() });
  expect(screen.getByRole("alert")).toHaveTextContent("Чат не найден");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("unknown errors use a safe fallback and retry is optional", () => {
  show({ chatError: new Error("private detail") });
  expect(screen.getByRole("alert")).toHaveTextContent("Не удалось загрузить сообщения");
  expect(screen.getByRole("alert")).not.toHaveTextContent("private detail");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("invalid ID takes priority over fingerprint and HTTP errors", () => {
  show({ hasInvalidId: true, fingerprintError: new Error(), chatError: httpError(500), onRetryChat: vi.fn() });
  expect(screen.getByRole("alert")).toHaveTextContent("Чат не найден");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("fingerprint failure selects its own retry callback", () => {
  const retry = vi.fn();
  const props = {
    fingerprintError: new Error(),
    chatError: httpError(500),
    onRetryFingerprint: retry,
    onRetryChat: vi.fn(),
    hasInvalidId: false,
  };
  show(props);
  expect(screen.getByRole("alert")).toHaveTextContent("идентификатор браузера");
  screen.getByRole("button", { name: "Повторить" }).click();
  expect(retry).toHaveBeenCalledOnce();
  expect(props.onRetryChat).not.toHaveBeenCalled();
});

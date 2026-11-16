import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { AxiosHeaders, type AxiosResponse } from "axios";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vitest";

import { ChatConversation } from "@widgets/chat-conversation";
import { useChatActions } from "@widgets/chat-conversation/hooks";

import { ChatService } from "@entities/chat/api";
import { useSendMessage } from "@entities/chat/hooks";
import { chatQueryOptions } from "@entities/chat/model";
import { ChatMessageRole, type ChatDetailDto, type ChatSession } from "@entities/chat/types";
import { DialogItem } from "@entities/dialog/ui";

import { LeadPage } from "./lead-page";

const summary = "Клиенту нужен учёт электроэнергии на складе.";

const session = (overrides: Partial<ChatSession> = {}): ChatSession => ({
  id: 42,
  fingerprint: "browser-id",
  isCompleted: false,
  summary: null,
  messages: [{ id: "1", role: ChatMessageRole.User, text: "Нужен учёт" }],
  ...overrides,
});

const clients: QueryClient[] = [];

const context = (route = "/") => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);

  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  return { client, wrapper: Wrapper };
};

const response = <T,>(data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: "OK",
  headers: {},
  config: { headers: new AxiosHeaders() },
});
afterEach(() => {
  clients.splice(0).forEach((client) => client.clear());
});

test("completion reaches the cache before history reload and survives reconciliation", async () => {
  const { client, wrapper } = context();
  const key = chatQueryOptions(42).queryKey;
  client.setQueryData(key, session({ summary: "Existing metadata" }));

  let releaseHistory: (() => void) | undefined;
  vi.spyOn(ChatService, "sendMessage").mockImplementation(async () => {
    expect(client.getQueryData(key)).toMatchObject({ fingerprint: "browser-id", summary: "Existing metadata" });
    expect(client.getQueryData(key)?.messages.at(-1)?.text).toBe("Свяжите с человеком");

    return response({ answer: "Заполните заявку", sources: [], routing: null, is_completed: true, summary });
  });
  vi.spyOn(ChatService, "getById").mockImplementation(async () => {
    expect(client.getQueryData(key)).toMatchObject({ isCompleted: true, summary });
    await new Promise<void>((resolve) => {
      releaseHistory = resolve;
    });

    return response<ChatDetailDto>({
      id: 42,
      fingerprint: "browser-id",
      created_at: "2026-11-16T00:00:00Z",
      is_completed: true,
      summary,
      messages: [
        { id: 5, chat_id: 42, role: "assistant", content: "Заполните заявку", created_at: "2026-11-16T00:00:00Z" },
      ],
    });
  });

  const settled = vi.fn(async () => {});

  const { result } = renderHook(() => useSendMessage({ onSettled: settled }), { wrapper });

  let pending: Promise<unknown> | undefined;
  act(() => {
    pending = result.current.mutateAsync({
      sessionId: 42,
      text: "Свяжите с человеком",
      debug: false,
      controller: new AbortController(),
    });
  });
  await waitFor(() => expect(releaseHistory).toBeTypeOf("function"));
  await act(async () => {
    releaseHistory?.();
    await pending;
  });
  expect(client.getQueryData(key)).toMatchObject({
    isCompleted: true,
    summary,
    fingerprint: "browser-id",
    messages: [{ id: "5", debug: { sources: [] } }],
  });
  expect(settled).toHaveBeenCalledOnce();
});

test("completed chats replace the composer and cannot send by pressing Enter", () => {
  const { client, wrapper } = context();
  const chat = session({ isCompleted: true, summary });
  client.setQueryData(chatQueryOptions(42).queryKey, chat);

  const view = render(<ChatConversation chat={chat} fingerprint="browser-id" isActive />, { wrapper });
  expect(screen.getByRole("button", { name: "Связаться с менеджером" })).toBeVisible();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  view.rerender(<ChatConversation chat={session()} fingerprint="browser-id" isActive />);
  expect(screen.getByRole("textbox", { name: "Сообщение" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Связаться с менеджером" })).not.toBeInTheDocument();
});

test.each([undefined, null, "   ", summary])("lead form requires completion and nonblank summary: %s", (value) => {
  const { client, wrapper } = context("/lead?chatId=42");
  client.setQueryData(
    chatQueryOptions(42).queryKey,
    session({ isCompleted: value !== undefined, summary: value ?? null })
  );
  render(<LeadPage isActive />, { wrapper });

  if (value === summary) {
    expect(screen.getByRole("form")).toBeVisible();
  } else {
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Перейти к переписке" })).toBeVisible();
  }
});

test.each(["/lead", "/lead?chatId=abc"])("direct route %s cannot submit a lead", (route) => {
  const { wrapper } = context(route);
  render(<LeadPage isActive />, { wrapper });
  expect(screen.queryByRole("form")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Перейти к переписке" })).toBeVisible();
});

test("history labels completion without claiming a lead was created", () => {
  const { wrapper } = context();
  render(
    <ul>
      <DialogItem
        dialog={{
          id: 42,
          title: "Диалог №42",
          createdAt: "2026-11-16T00:00:00Z",
          messageCount: 2,
          isCompleted: true,
          summary,
        }}
      />
    </ul>,
    { wrapper }
  );
  expect(screen.getByRole("link")).toHaveTextContent("Консультация завершена");
  expect(screen.getByRole("link")).not.toHaveTextContent(/Заявка создана|Заявка отправлена/);
});

test("the send handler rejects completed chats even with a stale view", () => {
  const { client, wrapper } = context();
  const chat = session({ isCompleted: true, summary });
  client.setQueryData(chatQueryOptions(42).queryKey, chat);

  const { result } = renderHook(() => useChatActions({ chat, fingerprint: "browser-id", isActive: true }), { wrapper });
  act(() => {
    result.current.sendMessage("Ещё вопрос");
  });
  expect(client.getMutationCache().getAll()).toHaveLength(0);
});

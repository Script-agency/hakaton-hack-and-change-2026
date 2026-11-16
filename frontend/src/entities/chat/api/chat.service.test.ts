import { QueryClient } from "@tanstack/react-query";
import type { AxiosAdapter } from "axios";
import { afterEach, expect, test, vi } from "vitest";

import { $axios } from "@shared/api";

import * as adapters from "../lib";
import { beginChatRequest, chatQueryOptions, finishChatRequest, resetChatState } from "../model";
import type { ChatDetailDto, ChatMessageDto, GenerationResponseDto } from "../types";
import { ChatService } from "./chat.service";

const created = { id: 42, fingerprint: "browser-id", created_at: "2026-11-15T10:00:00Z" };
const detail: ChatDetailDto = {
  ...created,
  is_completed: false,
  summary: null,
  messages: [
    { id: 1, chat_id: 42, role: "system", content: "Internal", created_at: created.created_at },
    { id: 2, chat_id: 42, role: "user", content: "Нужен учёт", created_at: created.created_at },
  ],
};
const originalAdapter = $axios.defaults.adapter;
afterEach(() => {
  $axios.defaults.adapter = originalAdapter;
});

test("chat service uses backend paths, payloads, signals and generation timeout", async () => {
  const adapter = vi.fn<AxiosAdapter>(async (config) => ({
    config,
    data: created,
    status: 200,
    statusText: "OK",
    headers: {},
  }));
  $axios.defaults.adapter = adapter;

  const controller = new AbortController();
  await ChatService.create({ fingerprint: created.fingerprint }, controller.signal);
  expect(adapter).toHaveBeenLastCalledWith(
    expect.objectContaining({
      url: "/generation/chat/new",
      timeout: 15000,
      signal: controller.signal,
      data: JSON.stringify({ fingerprint: "browser-id" }),
    })
  );
  await ChatService.sendMessage({ sessionId: 42, text: "Question", debug: false }, controller.signal);
  expect(adapter).toHaveBeenLastCalledWith(
    expect.objectContaining({
      url: "/generation/chat",
      timeout: 190000,
      signal: controller.signal,
      data: JSON.stringify({ conversation_id: 42, question: "Question", debug: false }),
    })
  );
});

test("shared chat query maps server IDs and omits internal messages", async () => {
  const adapter = vi.fn<AxiosAdapter>(async (config) => ({
    config,
    data: detail,
    status: 200,
    statusText: "OK",
    headers: {},
  }));
  $axios.defaults.adapter = adapter;

  const client = new QueryClient();

  try {
    const chat = await client.fetchQuery(chatQueryOptions(42));
    expect(chat.messages).toEqual([{ id: "2", role: "user", text: "Нужен учёт", createdAt: created.created_at }]);
    expect(adapter).toHaveBeenCalledWith(
      expect.objectContaining({ url: "/generation/chat/42", signal: expect.any(AbortSignal) })
    );
    expect(chatQueryOptions(42).queryKey).not.toEqual(chatQueryOptions(43).queryKey);
  } finally {
    client.clear();
  }
});

test("cancelled HTTP requests never contact the transport", async () => {
  const adapter = vi.fn();
  $axios.defaults.adapter = adapter;

  const controller = new AbortController();
  controller.abort();
  await expect(ChatService.create({ fingerprint: "browser-id" }, controller.signal)).rejects.toMatchObject({
    code: "ERR_CANCELED",
  });
  await expect(ChatService.sendMessage({ sessionId: 42, text: "Question" }, controller.signal)).rejects.toMatchObject({
    code: "ERR_CANCELED",
  });
  expect(adapter).not.toHaveBeenCalled();
});

test("request locks are independent and reset aborts every request", () => {
  const first = beginChatRequest(42);
  const creation = beginChatRequest("start");
  expect(beginChatRequest(42)).toBeUndefined();
  expect(beginChatRequest(43)).toBeDefined();
  finishChatRequest(42, new AbortController());
  expect(beginChatRequest(42)).toBeUndefined();
  resetChatState();
  expect(first?.signal.aborted).toBe(true);
  expect(creation?.signal.aborted).toBe(true);

  const next = beginChatRequest(42);
  expect(next).toBeDefined();

  if (next !== undefined) finishChatRequest(42, next);

  expect(beginChatRequest(42)).toBeDefined();
});

test("request adapters exclude client-only fields and preserve debug false, true and omission", () => {
  const input = Object.freeze({ fingerprint: "browser-id", text: "Question", controller: new AbortController() });
  expect(adapters.adapterCreateChatToDto(input)).toEqual({ fingerprint: "browser-id" });

  for (const debug of [true, false, undefined]) {
    expect(adapters.adapterSendMessageToDto({ sessionId: 42, text: "Question", debug })).toEqual({
      conversation_id: 42,
      question: "Question",
      ...(debug === undefined ? {} : { debug }),
    });
  }
});

test("creation, message and detail adapters preserve completion and omit transport metadata", () => {
  expect(adapters.adapterCreatedChatFromDto(created)).toEqual({
    id: 42,
    fingerprint: "browser-id",
    messages: [],
    isCompleted: false,
    summary: null,
  });

  const message: ChatMessageDto = { ...detail.messages[1], id: 7, role: "assistant", content: "Answer" };
  expect(adapters.adapterChatMessageFromDto(message)).toEqual({
    id: "7",
    role: "assistant",
    text: "Answer",
    createdAt: created.created_at,
  });
  expect(adapters.adapterChatMessageFromDto({ ...message, role: "system" })).toBeUndefined();
  expect(adapters.adapterChatFromDto({ ...detail, is_completed: true, summary: "Summary", messages: [] })).toEqual({
    id: 42,
    fingerprint: "browser-id",
    messages: [],
    isCompleted: true,
    summary: "Summary",
  });
});

test("generation adapter maps source titles and client duration", () => {
  const dto: GenerationResponseDto = {
    answer: "Answer",
    sources: [{ id: 1, document_id: 2, title: "Guide", filename: "guide.pdf" }],
    routing: null,
    is_completed: false,
    summary: null,
  };
  expect(adapters.adapterGeneratedMessageFromDto(dto, "reply", 1250)).toEqual({
    id: "reply",
    role: "assistant",
    text: "Answer",
    debug: { responseTimeMs: 1250, sources: ["Guide (guide.pdf)"] },
  });
  expect(adapters.adapterGeneratedMessageFromDto({ ...dto, sources: [] }, "reply", 0).debug).toEqual({
    responseTimeMs: 0,
    sources: [],
  });
});

test.each([
  [
    { duration_ms: 1250.5, prompt_tokens: 42, completion_tokens: 128 },
    { promptTokens: 42, completionTokens: 128 },
  ],
  [
    { prompt_tokens: 0, completion_tokens: 0 },
    { promptTokens: 0, completionTokens: 0 },
  ],
  [{ prompt_tokens: null, completion_tokens: null }, {}],
  [{ prompt_tokens: 42 }, { promptTokens: 42 }],
  [null, {}],
  [undefined, {}],
])("generation adapter preserves available token counts: %s", (debug, expected) => {
  const dto: GenerationResponseDto = {
    answer: "Answer",
    sources: [],
    routing: null,
    is_completed: false,
    summary: null,
    debug,
  };
  expect(adapters.adapterGeneratedMessageFromDto(dto, "reply", 100).debug).toEqual({
    responseTimeMs: 100,
    sources: [],
    ...expected,
  });
});

test.each([
  ["guide.pdf", "Guide (guide.pdf)"],
  ["  guide.pdf  ", "Guide (guide.pdf)"],
  ["", "Guide"],
  ["   ", "Guide"],
])("source label includes only a nonblank filename: %s", (filename, expected) => {
  const dto: GenerationResponseDto = {
    answer: "Answer",
    sources: [{ id: 1, document_id: 2, title: "Guide", filename }],
    routing: null,
    is_completed: false,
    summary: null,
  };
  expect(adapters.adapterGeneratedMessageFromDto(dto, "reply", 0).debug?.sources).toEqual([expected]);
});

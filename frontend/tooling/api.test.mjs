import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { QueryClient } from "@tanstack/react-query";
import { createServer } from "vite";

let server;
let client;
let chatService;
let chatAdapters;
let chatQueryOptions;
let dialogsQueryOptions;
let requests;
let getFingerprint;
let fingerprintLoads = 0;
let failFingerprint = true;
const seen = [];

before(async () => {
  globalThis.__loadTestFingerprint = (options) => {
    assert.equal(options.monitoring, false);
    fingerprintLoads += 1;
    return Promise.resolve({
      get: async () => {
        if (failFingerprint) throw new Error("Fingerprint unavailable");
        return { visitorId: "browser-id" };
      },
    });
  };
  server = await createServer({
    configFile: false,
    ssr: { noExternal: ["@fingerprintjs/fingerprintjs"] },
    resolve: {
      alias: {
        "@shared": fileURLToPath(new URL("../src/shared", import.meta.url)),
        "@fingerprintjs/fingerprintjs": "/test-fingerprint.js",
      },
    },
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [
      {
        name: "test-fingerprint",
        resolveId: (id) => (id === "/test-fingerprint.js" ? id : undefined),
        load: (id) =>
          id === "/test-fingerprint.js"
            ? "export default { load: (options) => globalThis.__loadTestFingerprint(options) }"
            : undefined,
      },
    ],
  });
  client = (await server.ssrLoadModule("/src/shared/api/index.ts")).$axios;
  chatService = (await server.ssrLoadModule("/src/entities/chat/api/index.ts")).ChatService;
  chatAdapters = await server.ssrLoadModule("/src/entities/chat/lib/index.ts");
  ({ chatQueryOptions, ...requests } = await server.ssrLoadModule("/src/entities/chat/model/index.ts"));
  ({ dialogsQueryOptions } = await server.ssrLoadModule("/src/entities/dialog/model/index.ts"));
  ({ getFingerprint } = await server.ssrLoadModule("/src/shared/lib/index.ts"));
  client.defaults.adapter = async (config) => {
    seen.push(config);
    let data;
    if (config.url.endsWith("/new")) {
      data = { id: 42, fingerprint: "browser-id", created_at: "2026-11-15T10:00:00Z" };
    } else if (config.url.endsWith("/list")) {
      data = [{ id: 42, fingerprint: config.params.fingerprint, created_at: "2026-11-15T10:00:00Z", message_count: 2 }];
    } else if (config.method === "post") {
      data = { answer: "Сколько точек учёта?", sources: [], routing: {} };
    } else {
      data = {
        id: 42,
        messages: [
          { id: 1, role: "system", content: "Internal", created_at: "2026-11-15T10:00:00Z" },
          { id: 2, role: "user", content: "Нужен учёт", created_at: "2026-11-15T10:00:01Z" },
          { id: 3, role: "assistant", content: "Сколько точек учёта?", created_at: "2026-11-15T10:00:02Z" },
        ],
      };
    }
    return { data, status: 200, statusText: "OK", headers: {}, config };
  };
});

after(async () => {
  requests?.resetChatState();
  delete globalThis.__loadTestFingerprint;
  await server?.close();
});

test("fingerprint requests share a promise, recover from failure and cache only the successful identity", async () => {
  const first = getFingerprint();
  assert.equal(getFingerprint(), first);
  await assert.rejects(first, (error) => {
    assert.equal(error.name, "FingerprintError");
    assert.equal(error.cause.message, "Fingerprint unavailable");
    return true;
  });
  failFingerprint = false;
  const retry = getFingerprint();
  assert.notEqual(retry, first);
  assert.equal(await retry, "browser-id");
  assert.equal(getFingerprint(), retry);
  assert.equal(fingerprintLoads, 2);
});

test("chat creation and generation use the backend paths, JSON payload and separate timeouts", async () => {
  const controller = new AbortController();
  const created = await chatService.create({ fingerprint: "browser-id" }, controller.signal);
  assert.equal(created.data.id, 42);
  assert.equal(seen.at(-1).url, "/generation/chat/new");
  assert.deepEqual(JSON.parse(seen.at(-1).data), { fingerprint: "browser-id" });
  assert.equal(seen.at(-1).timeout, 15000);
  const reply = await chatService.sendMessage({ text: "Нужен учёт", sessionId: 42 }, controller.signal);
  assert.equal(reply.data.answer, "Сколько точек учёта?");
  assert.equal(seen.at(-1).url, "/generation/chat");
  assert.equal(seen.at(-1).timeout, 190000);
  assert.deepEqual(JSON.parse(seen.at(-1).data), { question: "Нужен учёт", conversation_id: 42 });
  assert.equal(seen.at(-1).signal, controller.signal);
});

test("shared chat options map server messages and omit internal system messages", async () => {
  const queryClient = new QueryClient();
  try {
    const options = chatQueryOptions(42);
    const chat = await queryClient.fetchQuery(options);
    assert.deepEqual(
      chat.messages.map(({ id, role, text }) => ({ id, role, text })),
      [
        { id: "2", role: "user", text: "Нужен учёт" },
        { id: "3", role: "assistant", text: "Сколько точек учёта?" },
      ]
    );
    assert.equal(seen.at(-1).url, "/generation/chat/42");
    assert.ok(seen.at(-1).signal instanceof AbortSignal);
    assert.notDeepEqual(options.queryKey, chatQueryOptions(43).queryKey);
  } finally {
    queryClient.clear();
  }
});

test("history options scope the cache and HTTP query to the visitor, using message_count", async () => {
  const queryClient = new QueryClient();
  try {
    const options = dialogsQueryOptions("visitor-a");
    const dialogs = await queryClient.fetchQuery(options);
    assert.equal(seen.at(-1).params.fingerprint, "visitor-a");
    assert.deepEqual(dialogs, [{ id: 42, title: "Диалог №42", createdAt: "2026-11-15T10:00:00Z", messageCount: 2 }]);
    assert.notDeepEqual(options.queryKey, dialogsQueryOptions("visitor-b").queryKey);
    queryClient.setQueryData(dialogsQueryOptions("visitor-b").queryKey, []);
    await queryClient.invalidateQueries({ queryKey: options.queryKey });
    assert.equal(queryClient.getQueryState(options.queryKey).isInvalidated, true);
    assert.equal(queryClient.getQueryState(dialogsQueryOptions("visitor-b").queryKey).isInvalidated, false);
  } finally {
    queryClient.clear();
  }
});

test("HTTP requests reject already cancelled signals without contacting the adapter", async () => {
  const controller = new AbortController();
  controller.abort();
  const count = seen.length;
  await assert.rejects(chatService.create({ fingerprint: "browser-id" }, controller.signal), { code: "ERR_CANCELED" });
  await assert.rejects(chatService.sendMessage({ text: "Test", sessionId: 42 }, controller.signal), {
    code: "ERR_CANCELED",
  });
  assert.equal(seen.length, count);
});

test("request locks reject double sends, remain independent and reset cancels all in-flight work", () => {
  const first = requests.beginChatRequest(42);
  const creation = requests.beginChatRequest("start");
  assert.equal(requests.beginChatRequest(42), undefined);
  assert.ok(requests.beginChatRequest(43));
  requests.finishChatRequest(42, new AbortController());
  assert.equal(requests.beginChatRequest(42), undefined);
  requests.resetChatState();
  assert.equal(first.signal.aborted, true);
  assert.equal(creation.signal.aborted, true);
  const next = requests.beginChatRequest(42);
  assert.ok(next);
  requests.finishChatRequest(42, next);
  assert.ok(requests.beginChatRequest(42));
});

test("request adapters exclude client-only fields and preserve explicit debug settings", () => {
  const controller = new AbortController();
  const create = Object.freeze({ fingerprint: "browser-id", text: "Question", controller });
  assert.deepEqual(chatAdapters.adapterCreateChatToDto(create), { fingerprint: "browser-id" });
  const send = Object.freeze({ sessionId: 42, text: "Question", debug: false, controller });
  assert.deepEqual(chatAdapters.adapterSendMessageToDto(send), {
    conversation_id: 42,
    question: "Question",
    debug: false,
  });
  assert.deepEqual(chatAdapters.adapterSendMessageToDto({ sessionId: 42, text: "Question" }), {
    conversation_id: 42,
    question: "Question",
  });
  assert.equal(chatAdapters.adapterSendMessageToDto({ ...send, debug: true }).debug, true);
});

test("creation and history adapters return widget entities without transport metadata", () => {
  const created = Object.freeze({ id: 42, fingerprint: "browser-id", created_at: "2026-11-15T10:00:00Z" });
  assert.deepEqual(chatAdapters.adapterCreatedChatFromDto(created), { id: 42, messages: [] });
  const message = Object.freeze({
    id: 7,
    chat_id: 42,
    role: "assistant",
    content: "Answer",
    created_at: created.created_at,
  });
  assert.deepEqual(chatAdapters.adapterChatMessageFromDto(message), {
    id: "7",
    role: "assistant",
    text: "Answer",
    createdAt: created.created_at,
  });
  assert.equal(chatAdapters.adapterChatMessageFromDto({ ...message, role: "system" }), undefined);
  assert.deepEqual(chatAdapters.adapterChatFromDto({ ...created, messages: [] }), { id: 42, messages: [] });
});

test("generation adapter maps answer and source objects to a message with client timing", () => {
  const dto = Object.freeze({
    answer: "Answer",
    sources: Object.freeze([{ id: 1, document_id: 2, title: "Guide", filename: "guide.pdf" }]),
    routing: null,
    debug: { internal: true },
  });
  assert.deepEqual(chatAdapters.adapterGeneratedMessageFromDto(dto, "pending-answer", 1250), {
    id: "pending-answer",
    role: "assistant",
    text: "Answer",
    debug: { responseTimeMs: 1250, sources: ["Guide"] },
  });
  assert.deepEqual(chatAdapters.adapterGeneratedMessageFromDto({ ...dto, sources: [] }, "empty-sources", 0).debug, {
    responseTimeMs: 0,
    sources: [],
  });
});

import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server;
let chatService;
let useChatUi;
let resetChatUi;
let configureChatDebug;
let widgetRegistry;
let parseChatId;

before(async () => {
  server = await createServer({
    configFile: false,
    resolve: { alias: { "@shared": fileURLToPath(new URL("../src/shared", import.meta.url)) } },
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });

  const serviceModule = await server.ssrLoadModule("/src/entities/chat/api/index.ts");
  const storeModule = await server.ssrLoadModule("/src/entities/chat/model/chat-ui.store.ts");
  widgetRegistry = await server.ssrLoadModule("/src/app/widget-instance.ts");

  chatService = serviceModule.ChatMockService;
  parseChatId = (await server.ssrLoadModule("/src/entities/chat/lib/index.ts")).parseChatId;
  useChatUi = storeModule.useChatUi;
  resetChatUi = storeModule.resetChatUi;
  configureChatDebug = storeModule.configureChatDebug;
});

after(async () => {
  await server?.close();
});

test("the shared UI store resets debug settings and the draft for a fresh mount", () => {
  useChatUi.getState().setDebugEnabled(true);
  useChatUi.getState().setPanelOpen(true);
  useChatUi.getState().setDraft(1, "Склад, 40 точек учёта");

  assert.equal(useChatUi.getState().isDebugEnabled, true);
  assert.equal(useChatUi.getState().drafts[1], "Склад, 40 точек учёта");
  resetChatUi();
  assert.equal(useChatUi.getState().isDebugEnabled, false);
  assert.equal(useChatUi.getState().isPanelOpen, false);
  assert.deepEqual(useChatUi.getState().drafts, {});
  useChatUi.getState().setDraft(2, "Новый черновик");
  assert.equal(useChatUi.getState().drafts[2], "Новый черновик");
  resetChatUi();
});

test("debug configuration gates the switch, enables diagnostics and resets on unmount", () => {
  configureChatDebug(true);
  assert.equal(useChatUi.getState().isDebugAvailable, true);
  assert.equal(useChatUi.getState().isDebugEnabled, true);

  useChatUi.getState().setDebugEnabled(false);
  assert.equal(useChatUi.getState().isDebugAvailable, true);
  assert.equal(useChatUi.getState().isDebugEnabled, false);

  resetChatUi();
  assert.equal(useChatUi.getState().isDebugAvailable, false);
  assert.equal(useChatUi.getState().isDebugEnabled, false);

  configureChatDebug(false);
  assert.equal(useChatUi.getState().isDebugAvailable, false);
  assert.equal(useChatUi.getState().isDebugEnabled, false);
});

test("mounting a second widget is rejected even in another container; unmount releases the guard", () => {
  const first = { container: {}, instance: { unmount: () => {} } };
  const second = { container: {}, instance: { unmount: () => {} } };

  widgetRegistry.registerWidget(first);

  try {
    assert.throws(() => widgetRegistry.registerWidget(first), /Only one widget/);
    assert.throws(() => widgetRegistry.registerWidget(second), /Only one widget/);
    assert.equal(widgetRegistry.getMountedWidget(), first);
  } finally {
    widgetRegistry.unregisterWidget(first);
  }

  widgetRegistry.registerWidget(second);

  try {
    widgetRegistry.unregisterWidget(first);
    assert.equal(widgetRegistry.getMountedWidget(), second);
  } finally {
    widgetRegistry.unregisterWidget(second);
  }

  assert.equal(widgetRegistry.getMountedWidget(), undefined);
});

test("new mock sessions have independent identities and no messages", async () => {
  const first = await chatService.createSession(new AbortController().signal);
  const second = await chatService.createSession(new AbortController().signal);

  assert.notEqual(first.id, second.id);
  assert.deepEqual(first.messages, []);
  assert.deepEqual(second.messages, []);
});

test("cancelling an in-flight mock reply rejects it instead of delivering an old answer", async () => {
  const controller = new AbortController();
  const reply = chatService.sendMessage({ text: "Подозреваю потери электроэнергии", turn: 1 }, controller.signal);
  const rejected = assert.rejects(reply, { name: "AbortError" });

  controller.abort();
  await rejected;
  await assert.rejects(chatService.sendMessage({ text: "Новый вопрос", turn: 1 }, controller.signal), {
    name: "AbortError",
  });
});

test("suggested questions return relevant mock replies with debug metadata", async () => {
  const controller = new AbortController();

  const [losses, bills, metering, snt] = await Promise.all(
    [
      "Подозреваю потери электроэнергии",
      "У нас выросли счета за электричество",
      "Хочу наладить учёт электроэнергии",
      "Хотим установить счётчики в СНТ",
    ].map((text) => chatService.sendMessage({ text, turn: 1 }, controller.signal))
  );

  assert.match(losses.text, /потери/);
  assert.match(bills.text, /потери/);
  assert.match(metering.text, /сколько точек учёта/);
  assert.match(snt.text, /Для СНТ/);
  assert.equal(new Set([losses.id, bills.id, metering.id, snt.id]).size, 4);

  for (const reply of [losses, bills, metering, snt]) {
    assert.equal(reply.role, "assistent");
    assert.ok(reply.debug.responseTimeMs >= 0);
    assert.ok(reply.debug.sources.length > 0);
  }
});

test("session creation rejects cancellation and returns a numeric backend-style id", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(chatService.createSession(controller.signal), { name: "AbortError" });
  const session = await chatService.createSession(new AbortController().signal);
  assert.equal(typeof session.id, "number");
  assert.ok(Number.isSafeInteger(session.id));
  assert.ok(session.id > 4);
});

test("loading messages can be cancelled without delivering a stale conversation", async () => {
  const controller = new AbortController();
  const request = chatService.getSession(1, controller.signal);
  controller.abort();
  await assert.rejects(request, { name: "AbortError" });
  await assert.rejects(chatService.getSession(1, controller.signal), { name: "AbortError" });
});

test("drafts belong to their own sessions while multiple screens remain mounted", () => {
  useChatUi.getState().setDraft("start", "Новый вопрос");
  useChatUi.getState().setDraft(1, "Уточнение по складу");
  useChatUi.getState().setDraft(2, "Вопрос по СНТ");
  useChatUi.getState().setDraft(1, "");
  assert.equal(useChatUi.getState().drafts.start, "Новый вопрос");
  assert.equal(useChatUi.getState().drafts[2], "Вопрос по СНТ");
  assert.equal(useChatUi.getState().drafts[1], "");
  resetChatUi();
  assert.deepEqual(useChatUi.getState().drafts, {});
});

test("route parameters become numeric session IDs and malformed IDs cannot start a chat", () => {
  assert.equal(parseChatId("42"), 42);
  assert.equal(parseChatId("0"), 0);
  assert.equal(parseChatId(undefined), undefined);
  for (const value of ["", "abc", "1.5", "-1", "1e3", "9007199254740992", "4276cf18-c49f-4664-93f0-6e8a542e7b6a"]) {
    assert.equal(parseChatId(value), undefined);
  }
});

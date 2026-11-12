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

before(async () => {
  server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });

  const serviceModule = await server.ssrLoadModule("/src/entities/chat/api/index.ts");
  const storeModule = await server.ssrLoadModule("/src/entities/chat/model/chat-ui.store.ts");
  widgetRegistry = await server.ssrLoadModule("/src/app/widget-instance.ts");

  chatService = serviceModule.ChatMockService;
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
  useChatUi.getState().setDraft("Склад, 40 точек учёта");

  assert.equal(useChatUi.getState().isDebugEnabled, true);
  assert.equal(useChatUi.getState().draft, "Склад, 40 точек учёта");
  resetChatUi();
  assert.equal(useChatUi.getState().isDebugEnabled, false);
  assert.equal(useChatUi.getState().isPanelOpen, false);
  assert.equal(useChatUi.getState().draft, "");
  useChatUi.getState().setDraft("Новый черновик");
  assert.equal(useChatUi.getState().draft, "Новый черновик");
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
  const first = await chatService.getSession();
  const second = await chatService.getSession();

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

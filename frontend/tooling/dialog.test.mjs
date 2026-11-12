import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server;
let dialogService;
let chatService;
let formatMessageCount;

before(async () => {
  server = await createServer({
    configFile: false,
    resolve: { alias: { "@shared": fileURLToPath(new URL("../src/shared", import.meta.url)) } },
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });

  const serviceModule = await server.ssrLoadModule("/src/entities/dialog/api/index.ts");
  const libModule = await server.ssrLoadModule("/src/entities/dialog/lib/index.ts");

  dialogService = serviceModule.DialogMockService;
  chatService = (await server.ssrLoadModule("/src/entities/chat/api/index.ts")).ChatMockService;
  formatMessageCount = libModule.formatMessageCount;
});

after(async () => {
  await server?.close();
});

test("message count uses Russian plural forms", () => {
  assert.equal(formatMessageCount(1), "1 сообщение");
  assert.equal(formatMessageCount(2), "2 сообщения");
  assert.equal(formatMessageCount(5), "5 сообщений");
  assert.equal(formatMessageCount(11), "11 сообщений");
  assert.equal(formatMessageCount(21), "21 сообщение");
});

test("the dialog list is returned newest first", async () => {
  const dialogs = await dialogService.getDialogs(new AbortController().signal);
  const timestamps = dialogs.map((dialog) => new Date(dialog.updatedAt).getTime());

  assert.ok(dialogs.length > 0);
  assert.deepEqual(
    timestamps,
    [...timestamps].sort((a, b) => b - a)
  );
});

test("an aborted dialog request rejects with AbortError", async () => {
  const controller = new AbortController();
  const request = dialogService.getDialogs(controller.signal);

  controller.abort();

  await assert.rejects(request, { name: "AbortError" });
});

test("history cards describe the corresponding chat messages and sessions stay independent", async () => {
  const dialogs = await dialogService.getDialogs(new AbortController().signal);
  const sessions = await Promise.all(dialogs.map((dialog) => chatService.getSession(dialog.id)));

  for (const [index, dialog] of dialogs.entries()) {
    const session = sessions[index];
    assert.equal(session.id, dialog.id);
    assert.equal(session.messages.length, dialog.messageCount);
    assert.equal(session.messages.at(-1).text, dialog.preview);
    assert.equal(session.messages[0].role, "user");
  }

  sessions[0].messages.push({ id: "local", role: "user", text: "Продолжение разговора" });
  assert.equal(sessions[1].messages.length, dialogs[1].messageCount);
  assert.equal((await chatService.getSession(dialogs[0].id)).messages.length, dialogs[0].messageCount);
});

test("a created conversation appears in history with the service-returned id", async () => {
  const session = await chatService.createSession(new AbortController().signal);
  session.messages.push({ id: "first", role: "user", text: "Нужен учёт на складе" });
  chatService.recordSession(session);
  const dialogs = await dialogService.getDialogs(new AbortController().signal);
  assert.equal(dialogs[0].id, session.id);
  assert.equal(dialogs[0].title, "Нужен учёт на складе");
  assert.equal(dialogs[0].messageCount, 1);
  session.messages.push({ id: "reply", role: "assistent", text: "Сколько точек учёта?" });
  chatService.recordSession(session);
  const updated = await dialogService.getDialogs(new AbortController().signal);
  assert.equal(updated.filter((dialog) => dialog.id === session.id).length, 1);
  assert.equal(updated[0].messageCount, 2);
  assert.equal(updated[0].preview, "Сколько точек учёта?");
  chatService.reset();
  assert.ok(!(await dialogService.getDialogs(new AbortController().signal)).some((dialog) => dialog.id === session.id));
});

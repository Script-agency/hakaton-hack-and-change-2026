import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server;
let dialogService;
let formatMessageCount;

before(async () => {
  server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });

  const serviceModule = await server.ssrLoadModule("/src/entities/dialog/api/index.ts");
  const libModule = await server.ssrLoadModule("/src/entities/dialog/lib/index.ts");

  dialogService = serviceModule.DialogMockService;
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

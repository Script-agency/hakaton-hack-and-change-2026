import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server;
let formatMessageCount;

before(async () => {
  server = await createServer({
    configFile: false,
    resolve: { alias: { "@shared": fileURLToPath(new URL("../src/shared", import.meta.url)) } },
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });

  const libModule = await server.ssrLoadModule("/src/entities/dialog/lib/index.ts");

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

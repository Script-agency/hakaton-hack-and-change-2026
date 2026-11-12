import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server;
let widgetRegistry;
before(async () => {
  server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  widgetRegistry = await server.ssrLoadModule("/src/app/widget-instance.ts");
});
after(async () => {
  await server?.close();
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

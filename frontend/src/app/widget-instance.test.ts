import assert from "node:assert/strict";
import { test } from "vitest";

import * as widgetRegistry from "./widget-instance";

test("mounting a second widget is rejected even in another container; unmount releases the guard", () => {
  const first = { container: document.createElement("div"), instance: { unmount: () => {} } };

  const second = { container: document.createElement("div"), instance: { unmount: () => {} } };

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

import assert from "node:assert/strict";
import { test } from "vitest";

import { parseChatId } from "../lib";
import { configureChatDebug, resetChatUi, useChatUi } from "./chat-ui.store";

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
  assert.equal(parseChatId("0"), undefined);
  assert.equal(parseChatId(undefined), undefined);

  for (const value of ["", "abc", "1.5", "-1", "1e3", "9007199254740992", "4276cf18-c49f-4664-93f0-6e8a542e7b6a"]) {
    assert.equal(parseChatId(value), undefined);
  }
});

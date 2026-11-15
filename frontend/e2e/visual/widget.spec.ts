import type { Page } from "@playwright/test";

import { answer, expect, expectReply, fillContacts, openLeadForm, openWidget, sendMessage, test } from "../fixtures";

const screenshot = async (page: Page, name: string) => {
  const viewport = page.viewportSize();

  if (viewport === null) throw new Error("Missing viewport");

  await page.mouse.move(0, 0);
  await expect(page).toHaveScreenshot(name, {
    clip: {
      x: Math.max(0, viewport.width - 420),
      y: viewport.height - 620,
      width: Math.min(viewport.width, 420),
      height: 620,
    },
    animations: "disabled",
    caret: "hide",
  });
};

test.beforeEach(async ({ page }) => {
  // Keep dates stable while allowing fingerprint and React scheduling to run.
  await page.clock.setFixedTime(new Date("2026-11-16T07:00:00Z"));
});

test("closed launcher", async ({ page }) => {
  await page.goto("/fixture.html");
  await expect(page.getByRole("button", { name: "Открыть ИИ-помощника" })).toBeVisible();
  await screenshot(page, "launcher.png");
});

test("start screen", async ({ page }) => {
  await openWidget(page);
  await screenshot(page, "start.png");
});

test("conversation", async ({ page }) => {
  await openWidget(page);
  await sendMessage(page);
  await expectReply(page, answer);
  await screenshot(page, "conversation.png");
});

test("completed conversation", async ({ page, api }) => {
  api.completeNext = true;
  await openWidget(page);
  await sendMessage(page);
  await expect(page.getByRole("button", { name: "Связаться с менеджером" })).toBeVisible();
  await screenshot(page, "completed.png");
});

test("history", async ({ page }) => {
  await openWidget(page);
  await sendMessage(page);
  await expectReply(page, answer);
  await page.getByRole("button", { name: "История диалогов" }).click();
  await expect(page.getByRole("link", { name: /Диалог №42/ })).toBeVisible();
  await screenshot(page, "history.png");
});

test("lead form", async ({ page, api }) => {
  await openLeadForm(page, api);
  await screenshot(page, "lead-form.png");
});

test("lead validation error", async ({ page, api }) => {
  api.leadError = "duplicate";
  await openLeadForm(page, api);
  await fillContacts(page);
  await page.getByRole("button", { name: "Отправить заявку", exact: true }).click();
  await expect(page.getByText("Заявка с этим телефоном уже существует.", { exact: true })).toBeVisible();
  await screenshot(page, "lead-error.png");
});

test("lead success", async ({ page, api }) => {
  await openLeadForm(page, api);
  await fillContacts(page);
  await page.getByRole("button", { name: "Отправить заявку", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Заявка отправлена" })).toBeVisible();
  await screenshot(page, "lead-success.png");
});

test("debug diagnostics", async ({ page }) => {
  await openWidget(page, true);
  await page.clock.install({ time: new Date("2026-11-16T07:00:00Z") });
  await page.clock.pauseAt(new Date("2026-11-16T07:00:00Z"));

  const reconciled = page.waitForResponse((response) => response.url().endsWith("/api/generation/chat/42"));
  await sendMessage(page);
  await reconciled;
  await page.clock.runFor(100);

  await expect(page.getByText(/Ответ за 0 с/)).toBeVisible();
  await expect(page.getByText(/Токены на входе: 42.*Токены на выходе: 128/)).toBeVisible();
  await expect(page.getByText(/Источники: «Учёт электроэнергии \(guide\.pdf\)»/)).toBeVisible();
  await screenshot(page, "debug.png");
});

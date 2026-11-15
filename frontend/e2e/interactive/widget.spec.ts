import {
  answer,
  expect,
  expectReply,
  fillContacts,
  finalAnswer,
  openLeadForm,
  openWidget,
  sendMessage,
  summary,
  test,
} from "../fixtures";

test("launcher, Escape, focus and closing preserve a draft", async ({ page }) => {
  await openWidget(page);
  await expect(page.getByRole("dialog", { name: "ИИ-помощник" })).toBeFocused();
  await page.getByRole("textbox", { name: "Сообщение" }).fill("Черновик");
  await page.keyboard.press("Escape");

  const launcher = page.getByRole("button", { name: "Открыть ИИ-помощника" });
  await expect(launcher).toBeFocused();
  await expect(page.getByRole("textbox", { name: "Сообщение" })).not.toBeVisible();
  await launcher.click();
  await expect(page.getByRole("textbox", { name: "Сообщение" })).toHaveValue("Черновик");
  await page.getByRole("button", { name: "Закрыть ИИ-помощника" }).click();
  await expect(launcher).toBeVisible();
});

test("first message creates one chat; pending work rejects duplicate sends and retains history", async ({
  page,
  api,
}) => {
  let release = () => {};
  api.generationGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await openWidget(page);
  await sendMessage(page);
  await expect.poll(() => api.generations.length).toBe(1);
  await page.getByRole("textbox", { name: "Сообщение" }).fill("Ещё вопрос");
  await page.getByRole("textbox", { name: "Сообщение" }).press("Enter");
  await expect(page.getByRole("button", { name: "Отправить сообщение", exact: true })).toBeDisabled();
  expect(api.generations).toHaveLength(1);
  release();
  await expectReply(page, answer);
  api.generationGate = undefined;
  await sendMessage(page, "На складе 20 точек");
  await expect.poll(() => api.generations.length).toBe(2);
  await expect(page.getByRole("button", { name: "Отправить сообщение", exact: true })).toHaveAttribute(
    "title",
    "Введите сообщение"
  );
  expect(api.chats).toHaveLength(1);
  expect(api.generations.map((request) => request.conversation_id)).toEqual([42, 42]);
  expect(api.chats[0].messages.map((message) => message.role)).toEqual(["user", "assistant", "user", "assistant"]);
  await page.getByRole("button", { name: "Закрыть ИИ-помощника" }).click();
  await page.getByRole("button", { name: "Открыть ИИ-помощника" }).click();
  await expect(page.getByText("На складе 20 точек", { exact: true })).toBeVisible();
});

test("empty history, failed load and retry remain distinct", async ({ page, api }) => {
  await openWidget(page);
  api.historyFailures = 1;
  await page.getByRole("button", { name: "История диалогов" }).click();
  await expect(page.getByRole("alert")).toHaveText(/Сервер временно недоступен/);
  await page.getByRole("button", { name: "Повторить" }).click();
  await expect(page.getByRole("status")).toHaveText(/Сохранённых диалогов пока нет/);
});

test("completion survives history navigation and replaces composer with manager button", async ({ page, api }) => {
  api.completeNext = true;
  await openWidget(page);

  const hostUrl = page.url();
  await sendMessage(page);
  await expect(page.getByText(finalAnswer, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Связаться с менеджером" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Сообщение" })).toHaveCount(0);
  await page.getByRole("button", { name: "История диалогов" }).click();

  const dialog = page.getByRole("link", { name: /Диалог №42/ });
  await expect(dialog).toHaveText(/Консультация завершена/);
  await dialog.click();
  await expect(page.getByRole("button", { name: "Связаться с менеджером" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Сообщение" })).toHaveCount(0);
  expect(page.url()).toBe(hostUrl);
  expect(api.leads).toHaveLength(0);
});

test("generation failure does not repeat POST automatically and permits a new question", async ({ page, api }) => {
  api.generationFailures = 1;
  await openWidget(page);
  await sendMessage(page);
  await expect(page.getByRole("alert")).toHaveText(/Не удалось получить ответ/);
  expect(api.generations).toHaveLength(1);
  await sendMessage(page, "Уточняю вопрос");
  await expectReply(page, answer);
  expect(api.generations).toHaveLength(2);
});

test("lead validates contacts and sends summary and conversation reference once", async ({ page, api }) => {
  await openLeadForm(page, api);
  await page.getByRole("button", { name: "Отправить заявку", exact: true }).click();
  expect(api.leads).toHaveLength(0);
  await expect(page.getByRole("textbox", { name: "ФИО", exact: true })).toHaveAttribute("aria-invalid", "true");
  await fillContacts(page);

  let release = () => {};
  api.leadGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.getByRole("button", { name: "Отправить заявку", exact: true }).click();
  await expect.poll(() => api.leads.length).toBe(1);
  await expect(page.getByRole("button", { name: "Отправляю заявку…" })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Заявка отправлена" })).toHaveCount(0);
  expect(api.leads[0]).toEqual({
    company: "ООО Склад",
    full_name: "Иванов Иван Иванович",
    phone: "+79991234567",
    conversation_id: 42,
    fingerprint: api.chats[0].fingerprint,
    summary,
  });
  release();
  await expect(page.getByRole("heading", { name: "Заявка отправлена" })).toBeVisible();
  expect(api.leads).toHaveLength(1);
});

test("duplicate phone preserves contacts; correcting it allows submission", async ({ page, api }) => {
  api.leadError = "duplicate";
  await openLeadForm(page, api);
  await fillContacts(page);
  await page.getByRole("button", { name: "Отправить заявку", exact: true }).click();
  await expect(page.getByText("Заявка с этим телефоном уже существует.", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "ФИО", exact: true })).toHaveValue("Иванов Иван Иванович");
  await expect(page.getByRole("textbox", { name: "Компания", exact: true })).toHaveValue("ООО Склад");
  api.leadError = undefined;
  await page.getByRole("textbox", { name: "Телефон", exact: true }).fill("+7 (999) 123-45-68");
  await page.getByRole("button", { name: "Отправить заявку", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Заявка отправлена" })).toBeVisible();
  expect(api.leads).toHaveLength(2);
});

test("server failure preserves form fields without retrying POST", async ({ page, api }) => {
  api.leadError = "server";
  await openLeadForm(page, api);
  await fillContacts(page);
  await page.getByRole("button", { name: "Отправить заявку", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(/Не удалось отправить заявку/);
  await expect(page.getByRole("textbox", { name: "Телефон", exact: true })).toHaveValue("+7 (999) 123-45-67");
  expect(api.leads).toHaveLength(1);
  await expect(page.getByRole("heading", { name: "Заявка отправлена" })).toHaveCount(0);
});

test("debug mount enables diagnostics and switch controls subsequent requests", async ({ page, api }) => {
  await openWidget(page, true);
  await sendMessage(page);

  const toggle = page.getByRole("switch", { name: "Режим отладки" });
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText(/Ответ за .*Источники:.*Учёт электроэнергии/)).toBeVisible();
  await expect(page.getByText(/Токены на входе: 42.*Токены на выходе: 128/)).toBeVisible();
  await expect(page.getByText(/Источники: «Учёт электроэнергии \(guide\.pdf\)»/)).toBeVisible();
  expect(api.generations[0].debug).toBe(true);
  await toggle.click();
  await sendMessage(page, "Второй вопрос");
  await expect.poll(() => api.generations.length).toBe(2);
  expect(api.generations[1].debug).toBe(false);
  await expect(page.getByText(/Ответ за/)).toHaveCount(0);
});

test("default mount hides debug; host CSS, URL and DOM remain isolated", async ({ page, api }) => {
  await openWidget(page);

  const hostUrl = page.url();

  const hostStyles = await page.locator("#host-button").evaluate((button) => ({
    background: getComputedStyle(button).backgroundColor,
    radius: getComputedStyle(button).borderRadius,
  }));
  expect(hostStyles).toEqual({ background: "rgb(0, 255, 0)", radius: "0px" });

  const widgetBackground = await page
    .getByRole("button", { name: "Закрыть ИИ-помощника" })
    .evaluate((button) => getComputedStyle(button).backgroundColor);
  expect(widgetBackground).not.toBe(hostStyles.background);
  await sendMessage(page);
  await expectReply(page, answer);
  expect(api.generations[0].debug).toBe(false);
  await expect(page.getByRole("switch")).toHaveCount(0);
  await page.getByRole("button", { name: "История диалогов" }).click();
  expect(page.url()).toBe(hostUrl);
  await expect(page.locator("#host-text")).toHaveText("Сайт хостера");
});

test("second mount is rejected; unmount is idempotent and remount resets UI", async ({ page }) => {
  await openWidget(page, true);
  await page.getByRole("textbox", { name: "Сообщение" }).fill("Черновик");

  const error = await page.evaluate(() => {
    try {
      window.EnergyToolAssistant.mount();

      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  });
  expect(error).toMatch(/Only one widget/);
  await page.evaluate(() => {
    window.testWidget.unmount();
    window.testWidget.unmount();
  });
  await expect(page.getByRole("button", { name: "Открыть ИИ-помощника" })).toHaveCount(0);
  await page.evaluate(() => {
    window.testWidget = window.EnergyToolAssistant.mount();
  });
  await page.getByRole("button", { name: "Открыть ИИ-помощника" }).click();
  await expect(page.getByRole("textbox", { name: "Сообщение" })).toHaveValue("");
  await expect(page.getByRole("switch")).toHaveCount(0);
});

test("mobile panel stays in viewport and supports Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWidget(page);

  const panel = await page.getByRole("dialog", { name: "ИИ-помощник" }).boundingBox();
  expect(panel).not.toBeNull();

  if (panel === null) throw new Error("Missing panel");

  expect(panel.x).toBeGreaterThanOrEqual(0);
  expect(panel.y).toBeGreaterThanOrEqual(0);
  expect(panel.x + panel.width).toBeLessThanOrEqual(390);
  expect(panel.y + panel.height).toBeLessThanOrEqual(844);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Открыть ИИ-помощника" })).toBeFocused();
});

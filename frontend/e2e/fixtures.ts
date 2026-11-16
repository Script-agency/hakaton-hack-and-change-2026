import { test as base, expect, type Page } from "@playwright/test";

import type { ChatDetailDto, SendMessageRequestDto } from "../src/entities/chat/types";
import type { CreateLeadRequestDto } from "../src/entities/lead/types";

export const createdAt = "2026-11-16T07:00:00Z";
export const summary = "Клиенту нужен учёт электроэнергии на складе: 20 точек учёта.";
export const answer = "Уточните, сколько точек учёта на вашем складе?";
export const finalAnswer = "Заполните заявку — менеджер поможет подобрать решение.";

export class WidgetApi {
  chats: ChatDetailDto[] = [];
  generations: SendMessageRequestDto[] = [];
  leads: CreateLeadRequestDto[] = [];
  unexpected: string[] = [];
  historyFailures = 0;
  generationFailures = 0;
  generationGate: Promise<void> | undefined;
  leadGate: Promise<void> | undefined;
  completeNext = false;
  leadError: "duplicate" | "server" | undefined;

  async install(page: Page) {
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      const method = request.method();

      if (method === "POST" && path === "/api/generation/chat/new") {
        const body: { fingerprint: string } = request.postDataJSON();
        const chat: ChatDetailDto = {
          id: 42 + this.chats.length,
          fingerprint: body.fingerprint,
          created_at: createdAt,
          messages: [],
          is_completed: false,
          summary: null,
        };
        this.chats.push(chat);
        await route.fulfill({ json: chat });

        return;
      }

      if (method === "GET" && path === "/api/generation/chat/list") {
        if (this.historyFailures > 0) {
          this.historyFailures -= 1;
          await route.fulfill({ status: 503, json: { error: { message: "Unavailable" } } });

          return;
        }

        const fingerprint = new URL(request.url()).searchParams.get("fingerprint");
        await route.fulfill({
          json: this.chats
            .filter((chat) => chat.fingerprint === fingerprint)
            .map((chat) => ({ ...chat, message_count: chat.messages.length })),
        });

        return;
      }

      if (method === "GET" && /^\/api\/generation\/chat\/\d+$/.test(path)) {
        const chat = this.chats.find((item) => item.id === Number(path.split("/").at(-1)));
        await route.fulfill({
          status: chat === undefined ? 404 : 200,
          json: chat ?? { error: { message: "Not found" } },
        });

        return;
      }

      if (method === "POST" && path === "/api/generation/chat") {
        const body: SendMessageRequestDto = request.postDataJSON();
        this.generations.push(body);

        const chat = this.chats.find((item) => item.id === body.conversation_id);

        if (chat === undefined) throw new Error("Unknown conversation_id");

        chat.messages.push({
          id: chat.messages.length + 1,
          chat_id: chat.id,
          role: "user",
          content: body.question,
          created_at: createdAt,
        });
        await this.generationGate;

        if (this.generationFailures > 0) {
          this.generationFailures -= 1;
          await route.fulfill({ status: 503, json: { error: { message: "Unavailable" } } });

          return;
        }

        const content = this.completeNext ? finalAnswer : answer;
        chat.is_completed = this.completeNext;
        chat.summary = this.completeNext ? summary : null;
        chat.messages.push({
          id: chat.messages.length + 1,
          chat_id: chat.id,
          role: "assistant",
          content,
          created_at: createdAt,
        });
        await route.fulfill({
          json: {
            answer: content,
            sources: [{ id: 1, document_id: 2, title: "Учёт электроэнергии", filename: "guide.pdf" }],
            routing: { mode: "keyword", selected: ["10-energy"] },
            is_completed: chat.is_completed,
            summary: chat.summary,
            ...(body.debug === true
              ? { debug: { duration_ms: 1250.5, prompt_tokens: 42, completion_tokens: 128 } }
              : {}),
          },
        });

        return;
      }

      if (method === "POST" && path === "/api/leads") {
        const body: CreateLeadRequestDto = request.postDataJSON();
        this.leads.push(body);
        await this.leadGate;

        if (this.leadError !== undefined) {
          await route.fulfill({
            status: this.leadError === "duplicate" ? 400 : 503,
            json: {
              error: { details: { errors: this.leadError === "duplicate" ? { phone: ["Phone already exists"] } : {} } },
            },
          });

          return;
        }

        await route.fulfill({
          json: {
            item: { ...body, id: 12, status: "new", manager_note: null, created_at: createdAt, updated_at: createdAt },
          },
        });

        return;
      }

      this.unexpected.push(`${method} ${path}`);
      await route.abort("failed");
    });
    await page.route(/^https?:\/\/(?!127\.0\.0\.1:4175\/).*/, async (route) => {
      this.unexpected.push(route.request().url());
      await route.abort("blockedbyclient");
    });
  }
}

export const test = base.extend<{ api: WidgetApi }>({
  api: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));

      const api = new WidgetApi();
      await api.install(page);
      await use(api);
      expect(api.unexpected, "Unexpected network requests").toEqual([]);
      expect(errors, "Unhandled browser errors").toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

export const openWidget = async (page: Page, debug = false) => {
  await page.goto(`/fixture.html?debug=${String(debug)}`);
  await page.getByRole("button", { name: "Открыть ИИ-помощника" }).click();
  await expect(page.getByRole("textbox", { name: "Сообщение" })).toBeVisible();
};

export const sendMessage = async (page: Page, text = "Нужен учёт на складе") => {
  await page.getByRole("textbox", { name: "Сообщение" }).fill(text);
  await page.getByRole("button", { name: "Отправить сообщение", exact: true }).click();
};

export const openLeadForm = async (page: Page, api: WidgetApi) => {
  api.completeNext = true;
  await openWidget(page);
  await sendMessage(page);
  await page.getByRole("button", { name: "Связаться с менеджером" }).click();
  await expect(page.getByRole("form", { name: "Заявка менеджеру" })).toBeVisible();
};

export const fillContacts = async (page: Page) => {
  await page.getByRole("textbox", { name: "ФИО", exact: true }).fill("Иванов Иван Иванович");
  await page.getByRole("textbox", { name: "Телефон", exact: true }).fill("+7 (999) 123-45-67");
  await page.getByRole("textbox", { name: "Компания", exact: true }).fill("ООО Склад");
};

export const expectReply = async (page: Page, text: string) => {
  const reply = page.getByText(text, { exact: true });
  await expect(reply).toHaveCount(1);
  await expect(reply).toBeVisible();
};

import assert from "node:assert/strict";
import { AxiosHeaders, type AxiosAdapter } from "axios";
import { afterEach, beforeEach, test, vi } from "vitest";

import { $axios } from "@shared/api";

import * as adapters from "../lib";
import * as leadRequests from "../model";
import { LeadService } from "./lead.service";

const contact = { company: " Test company ", fullName: " Test Person ", phone: "+7 (999) 123-45-67" };
const request = {
  ...contact,
  summary: "Клиенту нужен учёт электроэнергии",
  conversationId: 42,
  fingerprint: "browser-id",
};

const adapter = vi.fn<AxiosAdapter>(async (config) => ({
  status: 200,
  statusText: "OK",
  headers: new AxiosHeaders(),
  config,
  data: {
    item: {
      ...adapters.adapterCreateLeadToDto(request),
      id: 12,
      status: "new",
      manager_note: null,
      created_at: "2026-11-15 10:00:00",
      updated_at: "2026-11-15 10:00:00",
    },
  },
}));

const originalAdapter = $axios.defaults.adapter;
beforeEach(() => {
  $axios.defaults.adapter = adapter;
});
afterEach(() => {
  $axios.defaults.adapter = originalAdapter;
});

test("lead service sends the agent summary and conversation reference without legacy messages", async () => {
  const controller = new AbortController();
  const { data } = await LeadService.create(request, controller.signal);
  const config = adapter.mock.calls.at(-1)?.[0];
  assert.ok(config);
  assert.equal(config.method, "post");
  assert.equal(config.url, "/leads");
  assert.equal(config.timeout, 15000);
  assert.equal(config.signal, controller.signal);
  assert.deepEqual(JSON.parse(String(config.data)), {
    company: "Test company",
    full_name: "Test Person",
    phone: "+79991234567",
    summary: request.summary,
    conversation_id: 42,
    fingerprint: "browser-id",
  });
  assert.equal(data.item.summary, request.summary);
  assert.deepEqual(adapters.adapterLeadFromDto(data.item), {
    id: 12,
    company: "Test company",
    fullName: "Test Person",
    phone: "+79991234567",
    summary: request.summary,
    status: "new",
    createdAt: "2026-11-15 10:00:00",
  });
});

test("lead adapters preserve input and omit legacy history", () => {
  const input = Object.freeze({ ...request });
  const dto = adapters.adapterCreateLeadToDto(input);
  assert.equal(Object.hasOwn(dto, "summary"), true);
  assert.equal(dto.summary, request.summary);
  assert.equal(Object.hasOwn(dto, "messages"), false);
  assert.equal(dto.conversation_id, 42);
  assert.equal(input.phone, contact.phone);
  assert.equal(input.company, contact.company);
});

test("lead requests lock double submissions and reset cancels in-flight HTTP work", async () => {
  const controller = leadRequests.beginLeadRequest();
  assert.ok(controller);
  assert.equal(leadRequests.beginLeadRequest(), undefined);
  leadRequests.finishLeadRequest(new AbortController());
  assert.equal(leadRequests.beginLeadRequest(), undefined);
  leadRequests.resetLeadState();
  assert.equal(controller.signal.aborted, true);

  const count = adapter.mock.calls.length;
  await assert.rejects(LeadService.create(request, controller.signal), { code: "ERR_CANCELED" });
  assert.equal(adapter.mock.calls.length, count);

  const next = leadRequests.beginLeadRequest();
  assert.ok(next);
  leadRequests.finishLeadRequest(next);
  assert.ok(leadRequests.beginLeadRequest());
});

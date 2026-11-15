import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { AxiosError } from "axios";
import { createServer } from "vite";

let server;
let client;
let LeadService;
let adapters;
let leadRequests;
let leadForm;
const seen = [];
const contact = { company: " Test company ", fullName: " Test Person ", phone: "+7 (999) 123-45-67" };
const request = { ...contact, summary: "", messages: [{ id: "1", role: "user", text: "Test question" }] };

before(async () => {
  server = await createServer({
    configFile: false,
    resolve: {
      alias: {
        "@shared": fileURLToPath(new URL("../src/shared", import.meta.url)),
        "@entities": fileURLToPath(new URL("../src/entities", import.meta.url)),
      },
    },
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  client = (await server.ssrLoadModule("/src/shared/api/index.ts")).$axios;
  ({ LeadService } = await server.ssrLoadModule("/src/entities/lead/api/index.ts"));
  adapters = await server.ssrLoadModule("/src/entities/lead/lib/index.ts");
  leadRequests = await server.ssrLoadModule("/src/entities/lead/model/index.ts");
  leadForm = await server.ssrLoadModule("/src/features/lead-request/lib/index.ts");
  client.defaults.adapter = async (config) => {
    seen.push(config);
    return {
      status: 200,
      statusText: "OK",
      headers: {},
      config,
      data: {
        item: {
          ...JSON.parse(config.data),
          id: 12,
          status: "new",
          manager_note: null,
          created_at: "2026-11-15 10:00:00",
          updated_at: "2026-11-15 10:00:00",
        },
      },
    };
  };
});

after(async () => {
  leadRequests?.resetLeadState();
  await server?.close();
});

test("lead service sends an explicit empty summary and adapts contact details and the conversation", async () => {
  const controller = new AbortController();
  const { data } = await LeadService.create(request, controller.signal);
  const config = seen.at(-1);
  assert.equal(config.method, "post");
  assert.equal(config.url, "/leads");
  assert.equal(config.timeout, 15000);
  assert.equal(config.signal, controller.signal);
  assert.deepEqual(JSON.parse(config.data), {
    company: "Test company",
    full_name: "Test Person",
    phone: "+79991234567",
    summary: "",
    messages: [{ role: "user", content: "Test question" }],
  });
  assert.equal(data.item.summary, "");
  assert.deepEqual(adapters.adapterLeadFromDto(data.item), {
    id: 12,
    company: "Test company",
    fullName: "Test Person",
    phone: "+79991234567",
    summary: "",
    status: "new",
    createdAt: "2026-11-15 10:00:00",
  });
});

test("lead adapters preserve the input and support a standalone request without messages", () => {
  const input = Object.freeze({ ...contact, summary: "", messages: Object.freeze([]) });
  const dto = adapters.adapterCreateLeadToDto(input);
  assert.equal(Object.hasOwn(dto, "summary"), true);
  assert.equal(dto.summary, "");
  assert.deepEqual(dto.messages, []);
  assert.equal(input.phone, contact.phone);
  assert.equal(input.company, contact.company);
});

test("backend validation fields map to the form and duplicate phones have a readable message", () => {
  const error = new AxiosError("Validation failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 400,
    data: {
      error: { details: { errors: { full_name: ["Name is invalid"], phone: ["Phone already exists"] } } },
    },
  });
  const result = leadForm.getLeadRequestError(error);
  assert.equal(result.fieldErrors.fullName, "Name is invalid");
  assert.equal(result.fieldErrors.phone, "Заявка с этим телефоном уже существует.");
  assert.equal(result.message, "Проверьте данные заявки.");
  assert.deepEqual(adapters.adapterLeadFieldErrorsFromDto(undefined), {
    company: undefined,
    fullName: undefined,
    phone: undefined,
  });
});

test("failed summary validation remains an error, while cancellation is silent", () => {
  const error = new AxiosError("Validation failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status: 400,
    data: {
      error: { details: { errors: { summary: ["Summary cannot be blank"] } } },
    },
  });
  assert.match(leadForm.getLeadRequestError(error).message, /Не удалось отправить заявку/);
  assert.equal(leadForm.getLeadRequestError(new AxiosError("Cancelled", "ERR_CANCELED")).message, undefined);
  assert.match(leadForm.getLeadRequestError(new AxiosError("Offline", "ERR_NETWORK")).message, /соединение/);
  assert.match(leadForm.getLeadRequestError(new AxiosError("Timeout", "ECONNABORTED")).message, /вовремя/);
});

test("contact validation rejects incomplete fields and enforces backend length limits", () => {
  assert.deepEqual(leadForm.validateLeadRequest(contact), {});
  assert.equal(Object.keys(leadForm.validateLeadRequest({ company: "", fullName: "", phone: "" })).length, 3);
  assert.ok(leadForm.validateLeadRequest({ ...contact, fullName: "Person" }).fullName);
  assert.ok(leadForm.validateLeadRequest({ ...contact, phone: "+7 (999)" }).phone);
  assert.ok(leadForm.validateLeadRequest({ ...contact, fullName: "A ".repeat(130) }).fullName);
  assert.ok(leadForm.validateLeadRequest({ ...contact, company: "A".repeat(256) }).company);
});

test("lead requests lock double submissions and reset cancels in-flight HTTP work", async () => {
  const controller = leadRequests.beginLeadRequest();
  assert.ok(controller);
  assert.equal(leadRequests.beginLeadRequest(), undefined);
  leadRequests.finishLeadRequest(new AbortController());
  assert.equal(leadRequests.beginLeadRequest(), undefined);
  leadRequests.resetLeadState();
  assert.equal(controller.signal.aborted, true);
  const count = seen.length;
  await assert.rejects(LeadService.create(request, controller.signal), { code: "ERR_CANCELED" });
  assert.equal(seen.length, count);
  const next = leadRequests.beginLeadRequest();
  assert.ok(next);
  leadRequests.finishLeadRequest(next);
  assert.ok(leadRequests.beginLeadRequest());
});

import assert from "node:assert/strict";
import { AxiosError, AxiosHeaders } from "axios";
import { test } from "vitest";

import * as adapters from "@entities/lead/lib";

import { getLeadRequestError } from "./get-lead-request-error";
import { validateLeadRequest } from "./validate-lead-request";

const contact = { company: " Test company ", fullName: " Test Person ", phone: "+7 (999) 123-45-67" };
test("backend validation fields map to the form and duplicate phones have a readable message", () => {
  const error = new AxiosError("Validation failed", "ERR_BAD_REQUEST", undefined, undefined, {
    config: { headers: new AxiosHeaders() },
    headers: {},
    statusText: "Bad Request",
    status: 400,
    data: {
      error: { details: { errors: { full_name: ["Name is invalid"], phone: ["Phone already exists"] } } },
    },
  });
  const result = getLeadRequestError(error);
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
    config: { headers: new AxiosHeaders() },
    headers: {},
    statusText: "Bad Request",
    status: 400,
    data: {
      error: { details: { errors: { summary: ["Summary cannot be blank"] } } },
    },
  });
  assert.match(getLeadRequestError(error).message ?? "", /Не удалось отправить заявку/);
  assert.equal(getLeadRequestError(new AxiosError("Cancelled", "ERR_CANCELED")).message, undefined);
  assert.match(getLeadRequestError(new AxiosError("Offline", "ERR_NETWORK")).message ?? "", /соединение/);
  assert.match(getLeadRequestError(new AxiosError("Timeout", "ECONNABORTED")).message ?? "", /вовремя/);
});

test("contact validation rejects incomplete fields and enforces backend length limits", () => {
  assert.deepEqual(validateLeadRequest(contact), {});
  assert.equal(Object.keys(validateLeadRequest({ company: "", fullName: "", phone: "" })).length, 3);
  assert.notEqual(validateLeadRequest({ ...contact, fullName: "Person" }).fullName, undefined);
  assert.notEqual(validateLeadRequest({ ...contact, phone: "+7 (999)" }).phone, undefined);
  assert.notEqual(validateLeadRequest({ ...contact, fullName: "A ".repeat(130) }).fullName, undefined);
  assert.notEqual(validateLeadRequest({ ...contact, company: "A".repeat(256) }).company, undefined);
});

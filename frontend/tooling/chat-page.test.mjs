import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { AxiosError } from "axios";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

let server;
let ChatNotFoundError;
let FingerprintError;
let ChatPageError;

before(async () => {
  server = await createServer({
    configFile: false,
    resolve: { alias: { "@shared": fileURLToPath(new URL("../src/shared", import.meta.url)) } },
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  ({ ChatNotFoundError } = await server.ssrLoadModule("/src/pages/chat/lib/index.ts"));
  ({ FingerprintError } = await server.ssrLoadModule("/src/shared/lib/index.ts"));
  ({ ChatPageError } = await server.ssrLoadModule("/src/pages/chat/ui/chat-page-error/index.ts"));
});

after(async () => {
  await server?.close();
});

const httpError = (status) => new AxiosError("Request failed", "ERR_BAD_RESPONSE", undefined, undefined, { status });

const renderPageError = (props) =>
  renderToStaticMarkup(
    createElement(ChatPageError, {
      hasInvalidId: false,
      fingerprintError: null,
      chatError: null,
      ...props,
    })
  );

const renderError = (error, onRetry = () => {}) => renderPageError({ chatError: error, onRetryChat: onRetry });

test("the error component recognizes raw request errors without a caller-supplied type", () => {
  const cases = [
    [httpError(500), /Сервер временно недоступен/],
    [httpError(503), /Сервер временно недоступен/],
    [new AxiosError("Offline", "ERR_NETWORK"), /соединение с интернетом/],
    [new AxiosError("Timeout", "ECONNABORTED"), /время ожидания/],
    [new AxiosError("Timeout", "ETIMEDOUT"), /время ожидания/],
    [new FingerprintError(new Error("Fingerprint unavailable")), /идентификатор браузера/],
  ];
  for (const [error, message] of cases) {
    const html = renderError(error);
    assert.match(html, message);
    assert.match(html, /<button/);
    assert.match(html, /Повторить/);
  }
});

test("invalid IDs and HTTP 404 share the missing-chat view with no retry button", () => {
  for (const error of [new ChatNotFoundError(), httpError(404)]) {
    const html = renderError(error);
    assert.match(html, /role="alert"/);
    assert.match(html, /Чат не найден/);
    assert.doesNotMatch(html, /<button/);
  }
});

test("unknown errors use a safe fallback and retry requires a callback", () => {
  for (const error of [httpError(400), new Error("Internal technical detail"), null]) {
    const html = renderError(error);
    assert.match(html, /Не удалось загрузить сообщения/);
    assert.doesNotMatch(html, /Internal technical detail/);
    assert.match(html, /<button/);
    assert.doesNotMatch(renderPageError({ chatError: error }), /<button/);
  }
});

test("the component prioritizes an invalid ID over both query errors and disables retries", () => {
  const html = renderPageError({
    hasInvalidId: true,
    fingerprintError: new Error("Fingerprint failed"),
    chatError: httpError(500),
    onRetryFingerprint: () => {},
    onRetryChat: () => {},
  });
  assert.match(html, /Чат не найден/);
  assert.doesNotMatch(html, /<button/);
});

test("fingerprint failure takes precedence over chat failure and selects its own retry", () => {
  const html = renderPageError({
    fingerprintError: new Error("Fingerprint failed"),
    chatError: httpError(500),
    onRetryFingerprint: () => {},
  });
  assert.match(html, /идентификатор браузера/);
  assert.match(html, /<button/);
  const noFingerprintRetry = renderPageError({
    fingerprintError: new Error("Fingerprint failed"),
    chatError: httpError(500),
    onRetryChat: () => {},
  });
  assert.doesNotMatch(noFingerprintRetry, /<button/);
  assert.match(renderPageError({ chatError: httpError(500), onRetryChat: () => {} }), /<button/);
});

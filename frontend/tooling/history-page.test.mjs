import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { AxiosError } from "axios";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

let server;
let HistoryPageError;
let HistoryPageEmpty;
let HistoryPageLoading;

before(async () => {
  server = await createServer({
    configFile: false,
    resolve: { alias: { "@shared": fileURLToPath(new URL("../src/shared", import.meta.url)) } },
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  ({ HistoryPageError } = await server.ssrLoadModule("/src/pages/history/ui/history-page-error/index.ts"));
  ({ HistoryPageEmpty } = await server.ssrLoadModule("/src/pages/history/ui/history-page-empty/index.ts"));
  ({ HistoryPageLoading } = await server.ssrLoadModule("/src/pages/history/ui/history-page-loading/index.ts"));
});

after(async () => {
  await server?.close();
});

const props = (overrides) => ({ fingerprintError: null, historyError: null, ...overrides });
const renderError = (overrides) => renderToStaticMarkup(createElement(HistoryPageError, props(overrides)));

test("history errors distinguish network failures, timeouts and server failures", () => {
  const cases = [
    [new AxiosError("Offline", "ERR_NETWORK"), /соединение с интернетом/],
    [new AxiosError("Timeout", "ECONNABORTED"), /время ожидания/],
    [new AxiosError("Timeout", "ETIMEDOUT"), /время ожидания/],
    [new AxiosError("Server", "ERR_BAD_RESPONSE", undefined, undefined, { status: 503 }), /Сервер временно недоступен/],
  ];
  for (const [historyError, message] of cases) {
    const html = renderError({ historyError, onRetryHistory: () => {} });
    assert.match(html, /role="alert"/);
    assert.match(html, message);
    assert.match(html, /Повторить/);
  }
});

test("fingerprint errors take priority and use the fingerprint retry callback", () => {
  const onRetryFingerprint = () => {};
  const onRetryHistory = () => {};
  const options = props({
    fingerprintError: new Error("Fingerprint failure"),
    historyError: new AxiosError("Offline", "ERR_NETWORK"),
    onRetryFingerprint,
    onRetryHistory,
  });
  assert.match(renderError(options), /идентификатор браузера/);
  const view = HistoryPageError(options);
  assert.equal(view.props.children[1].props.onClick, onRetryFingerprint);
  const historyView = HistoryPageError({ ...options, fingerprintError: null });
  assert.equal(historyView.props.children[1].props.onClick, onRetryHistory);
});

test("unknown errors do not expose technical details and retry is optional", () => {
  const html = renderError({ historyError: new Error("private server detail") });
  assert.match(html, /Не удалось загрузить историю диалогов/);
  assert.doesNotMatch(html, /private server detail/);
  assert.doesNotMatch(html, /<button/);
  assert.doesNotMatch(renderError({ fingerprintError: new Error("failure"), onRetryHistory: () => {} }), /<button/);
});

test("history empty and loading views expose distinct accessible status messages", () => {
  const empty = renderToStaticMarkup(createElement(HistoryPageEmpty));
  const loading = renderToStaticMarkup(createElement(HistoryPageLoading));
  assert.match(empty, /role="status"/);
  assert.match(empty, /Сохранённых диалогов пока нет/);
  assert.match(loading, /role="status"/);
  assert.match(loading, /Загружаю историю/);
  assert.doesNotMatch(loading, /Сохранённых диалогов/);
});

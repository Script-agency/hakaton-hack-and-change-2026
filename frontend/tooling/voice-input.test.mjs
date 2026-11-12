import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

let server;
let voice;

before(async () => {
  server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  voice = await server.ssrLoadModule("/src/features/send-message/lib/index.ts");
});

after(async () => {
  await server?.close();
});

const result = (transcript, isFinal = false) => ({ 0: { transcript }, isFinal });

test("dictation preserves the draft and replaces interim results without duplicating them", () => {
  const draft = "Наш объект — склад,";

  assert.equal(voice.getVoiceDraft(draft, [result("сорок")]), "Наш объект — склад, сорок");
  assert.equal(
    voice.getVoiceDraft(draft, [result("сорок точек учёта", true)]),
    "Наш объект — склад, сорок точек учёта"
  );
  assert.equal(
    voice.getVoiceDraft(draft, [result("сорок точек учёта", true)]),
    "Наш объект — склад, сорок точек учёта"
  );
});

test("dictation joins cumulative recognition results and respects existing spaces and line breaks", () => {
  assert.equal(voice.getVoiceDraft("", [result("Проверить", true), result("показания")]), "Проверить показания");
  assert.equal(voice.getVoiceDraft("Склад ", [result("и офис")]), "Склад и офис");
  assert.equal(voice.getVoiceDraft("Склад\n", [result("и офис")]), "Склад\nи офис");
  assert.equal(voice.getVoiceDraft("Черновик", [result("   ")]), "Черновик");
  assert.equal(voice.getVoiceDraft("Черновик", []), "Черновик");
});

test("recognition supports the standard API, the prefixed fallback and unsupported browsers", () => {
  class StandardRecognition {}
  class PrefixedRecognition {}

  assert.equal(
    voice.getVoiceRecognitionConstructor({
      SpeechRecognition: StandardRecognition,
      webkitSpeechRecognition: PrefixedRecognition,
    }),
    StandardRecognition
  );
  assert.equal(
    voice.getVoiceRecognitionConstructor({ webkitSpeechRecognition: PrefixedRecognition }),
    PrefixedRecognition
  );
  assert.equal(voice.getVoiceRecognitionConstructor({}), undefined);
  assert.equal(voice.getVoiceRecognitionConstructor(), undefined);
});

test("recognition errors explain permissions, connectivity and missing speech; cancellation is silent", () => {
  assert.match(voice.getVoiceInputError("not-allowed"), /доступа к микрофону/);
  assert.match(voice.getVoiceInputError("audio-capture"), /Микрофон недоступен/);
  assert.match(voice.getVoiceInputError("no-speech"), /Речь не распознана/);
  assert.match(voice.getVoiceInputError("network"), /интернету/);
  assert.match(voice.getVoiceInputError("unknown"), /введите сообщение вручную/);
  assert.equal(voice.getVoiceInputError("aborted"), null);
});

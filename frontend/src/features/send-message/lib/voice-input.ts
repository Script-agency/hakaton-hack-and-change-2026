import type { VoiceRecognitionResult, VoiceRecognitionWindow } from "../types";

export const getVoiceRecognitionConstructor = (
  scope: VoiceRecognitionWindow | undefined = typeof window === "undefined" ? undefined : window
) => scope?.SpeechRecognition ?? scope?.webkitSpeechRecognition;

export const getVoiceDraft = (draft: string, results: ArrayLike<VoiceRecognitionResult>) => {
  const transcript = Array.from(results)
    .map((result) => result[0]?.transcript.trim() ?? "")
    .filter((part) => part.length > 0)
    .join(" ");

  if (transcript.length === 0) {
    return draft;
  }

  return `${draft}${draft.length > 0 && !/\s$/.test(draft) ? " " : ""}${transcript}`;
};

export const getVoiceInputError = (code: string): string | null => {
  switch (code) {
    case "aborted":
      return null;
    case "not-allowed":
    case "service-not-allowed":
      return "Нет доступа к микрофону. Разрешите его использование в настройках браузера.";
    case "audio-capture":
      return "Микрофон недоступен. Проверьте, что он подключён и не занят другим приложением.";
    case "no-speech":
      return "Речь не распознана. Попробуйте ещё раз.";
    case "network":
      return "Сервис распознавания недоступен. Проверьте подключение к интернету и попробуйте ещё раз.";
    case "language-not-supported":
      return "Распознавание русской речи недоступно в этом браузере.";
    default:
      return "Не удалось распознать речь. Попробуйте ещё раз или введите сообщение вручную.";
  }
};

import { createChatSession } from "../lib";
import { ChatMessageRole, type ChatMessage, type MockReplyRequest } from "../types";

const getReply = ({ text, turn }: MockReplyRequest) => {
  if (turn > 1) {
    return {
      text:
        "Для такого объекта подойдёт АСКУЭ Energytool: автоматический сбор показаний и сравнение баланса " +
        "по вводу и потребителям покажут, где теряется энергия. " +
        "Подскажите, сейчас показания собираются вручную или автоматически?",
      sources: ["АСКУЭ для бизнеса", "Баланс по вводу"],
    };
  }

  if (/потер|счета|счёта|вырос/i.test(text)) {
    return {
      text:
        "Понял. Чаще всего потери связаны с безучётным потреблением или устаревшими счётчиками. " +
        "Подскажите, какой у вас объект: офис, производство или посёлок?",
      sources: ["Выявление потерь", "АСКУЭ для бизнеса"],
    };
  }

  if (/снт|посёл|посел/i.test(text)) {
    return {
      text:
        "Для СНТ можно организовать автоматический сбор показаний и контроль баланса электроэнергии. " +
        "Сколько участков нужно подключить и установлены ли сейчас счётчики?",
      sources: ["Учёт электроэнергии в СНТ"],
    };
  }

  return {
    text:
      "Помогу подобрать решение для учёта электроэнергии. " +
      "Расскажите, какой у вас объект и сколько точек учёта нужно подключить?",
    sources: ["АСКУЭ для бизнеса"],
  };
};

// Local demonstration data only; no backend contract or HTTP endpoint is assumed.
class _ChatMockService {
  getSession = () => Promise.resolve(createChatSession());
  sendMessage = (request: MockReplyRequest, signal: AbortSignal): Promise<ChatMessage> => {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException("Request aborted", "AbortError"));

        return;
      }

      const startedAt = performance.now();

      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException("Request aborted", "AbortError"));
      };

      const timer = setTimeout(() => {
        signal.removeEventListener("abort", abort);

        const reply = getReply(request);

        resolve({
          id: crypto.randomUUID(),
          role: ChatMessageRole.Assistent,
          text: reply.text,
          debug: {
            responseTimeMs: performance.now() - startedAt,
            sources: reply.sources,
          },
        });
      }, 1800);

      signal.addEventListener("abort", abort, { once: true });
    });
  };
}

export const ChatMockService = new _ChatMockService();

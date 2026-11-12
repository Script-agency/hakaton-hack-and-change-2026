import { demoDialogs, mockDialogHistory } from "@shared/lib";

import { createChatSession } from "../lib";
import { ChatMessageRole, type ChatMessage, type ChatSession, type MockReplyRequest } from "../types";

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
  private nextSessionId = Math.max(...demoDialogs.map((dialog) => dialog.id)) + 1;
  createSession = async (signal: AbortSignal): Promise<ChatSession> => {
    signal.throwIfAborted();

    // Replace this mock with the backend creation request when its contract is available.
    const session = createChatSession(this.nextSessionId);

    this.nextSessionId += 1;

    return session;
  };
  getInitialSession = (id: number): ChatSession => {
    const dialog = demoDialogs.find((item) => item.id === id);

    return {
      id,
      messages:
        dialog?.turns.flatMap(([question, answer], index) => [
          { id: `${id}-${index}-user`, role: ChatMessageRole.User, text: question },
          { id: `${id}-${index}-assistant`, role: ChatMessageRole.Assistent, text: answer },
        ]) ?? [],
    };
  };
  getSession = (id: number, signal?: AbortSignal): Promise<ChatSession> => {
    return new Promise((resolve, reject) => {
      if (signal?.aborted === true) {
        reject(new DOMException("Request aborted", "AbortError"));

        return;
      }

      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException("Request aborted", "AbortError"));
      };

      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", abort);
        resolve(this.getInitialSession(id));
      }, 400);

      signal?.addEventListener("abort", abort, { once: true });
    });
  };
  recordSession = (session: ChatSession) => {
    if (session.messages.length === 0) {
      return;
    }

    mockDialogHistory.save({
      id: session.id,
      title: session.messages[0].text,
      preview: session.messages[session.messages.length - 1].text,
      updatedAt: new Date().toISOString(),
      messageCount: session.messages.length,
    });
  };
  reset = () => mockDialogHistory.reset();
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

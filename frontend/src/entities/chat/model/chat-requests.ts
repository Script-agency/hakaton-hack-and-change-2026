import type { ChatSessionKey } from "../types";
import { resetChatUi } from "./chat-ui.store";

const activeRequests = new Map<ChatSessionKey, AbortController>();

export const beginChatRequest = (key: ChatSessionKey) => {
  if (activeRequests.has(key)) {
    return undefined;
  }

  const controller = new AbortController();
  activeRequests.set(key, controller);

  return controller;
};

export const finishChatRequest = (key: ChatSessionKey, controller: AbortController) => {
  if (activeRequests.get(key) === controller) {
    activeRequests.delete(key);
  }
};

export const resetChatState = () => {
  activeRequests.forEach((controller) => controller.abort());
  activeRequests.clear();
  resetChatUi();
};

import type { ChatSession } from "../types";

export const createChatSession = (): ChatSession => ({
  id: crypto.randomUUID(),
  messages: [],
});

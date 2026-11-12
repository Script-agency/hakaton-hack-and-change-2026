import type { ChatSession } from "../types";

export const createChatSession = (id: number): ChatSession => ({
  id,
  messages: [],
});

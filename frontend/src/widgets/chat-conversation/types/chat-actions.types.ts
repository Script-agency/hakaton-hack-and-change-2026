import type { ChatSession } from "@entities/chat/types";

export interface UseChatActionsOptions {
  chat?: ChatSession;
  fingerprint: string;
  isActive: boolean;
}

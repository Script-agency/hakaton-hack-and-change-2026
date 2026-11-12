export interface ChatDebugInfo {
  responseTimeMs: number;
  sources: string[];
}

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  text: string;
  debug?: ChatDebugInfo;
}

export type ChatSessionKey = number | "start";

export interface ChatSession {
  id: number;
  messages: ChatMessage[];
}

export interface MockReplyRequest {
  text: string;
  turn: number;
}

export enum ChatMessageRole {
  User = "user",
  Assistent = "assistent",
}

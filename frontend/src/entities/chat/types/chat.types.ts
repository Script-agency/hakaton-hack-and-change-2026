export interface ChatDebugInfo {
  responseTimeMs: number;
  sources: string[];
}

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  text: string;
  createdAt?: string;
  debug?: ChatDebugInfo;
}

export type ChatSessionKey = number | "start";

export interface ChatSession {
  id: number;
  messages: ChatMessage[];
}

export enum ChatMessageRole {
  User = "user",
  Assistant = "assistant",
}

export interface CreateChatRequest {
  fingerprint: string;
}

export interface SendMessageRequest {
  sessionId: number;
  text: string;
  debug?: boolean;
}

export interface CreateChatVariables extends CreateChatRequest {
  text: string;
  controller: AbortController;
}

export interface SendMessageVariables extends SendMessageRequest {
  debug: boolean;
  controller: AbortController;
}

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

export interface ChatSession {
  id: string;
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

export interface CreateChatRequestDto {
  fingerprint: string;
}

export interface ChatCreatedDto {
  id: number;
  fingerprint: string;
  created_at: string;
}

export interface ChatMessageDto {
  id: number;
  chat_id: number;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface ChatDetailDto extends ChatCreatedDto {
  messages: ChatMessageDto[];
  is_completed: boolean;
  summary: string | null;
}

export interface SendMessageRequestDto {
  question: string;
  conversation_id: number;
  debug?: boolean;
}

export interface GenerationSourceDto {
  id: number;
  document_id: number;
  title: string;
  filename: string;
}

export interface GenerationResponseDto {
  answer: string;
  is_completed: boolean;
  summary: string | null;
  sources: GenerationSourceDto[];
  routing: Record<string, unknown> | null;
  debug?: {
    duration_ms?: number | null;
    prompt_tokens?: number | null;
    completion_tokens?: number | null;
    [key: string]: unknown;
  } | null;
}

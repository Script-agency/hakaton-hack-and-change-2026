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
  sources: GenerationSourceDto[];
  routing: Record<string, unknown> | null;
  debug?: Record<string, unknown> | null;
}

import {
  ChatMessageRole,
  type ChatCreatedDto,
  type ChatDetailDto,
  type ChatMessage,
  type ChatMessageDto,
  type ChatSession,
  type CreateChatRequest,
  type CreateChatRequestDto,
  type GenerationResponseDto,
  type SendMessageRequest,
  type SendMessageRequestDto,
} from "../types";

export const adapterChatMessageFromDto = (dto: ChatMessageDto): ChatMessage | undefined => {
  if (dto.role === "system") {
    return undefined;
  }

  return {
    id: String(dto.id),
    role: dto.role === "user" ? ChatMessageRole.User : ChatMessageRole.Assistant,
    text: dto.content,
    createdAt: dto.created_at,
  };
};

export const adapterChatFromDto = (dto: ChatDetailDto): ChatSession => ({
  id: dto.id,
  fingerprint: dto.fingerprint,
  isCompleted: dto.is_completed,
  summary: dto.summary,
  messages: dto.messages.flatMap((item) => {
    const message = adapterChatMessageFromDto(item);

    return message === undefined ? [] : [message];
  }),
});

export const adapterCreatedChatFromDto = (dto: ChatCreatedDto): ChatSession => ({
  id: dto.id,
  fingerprint: dto.fingerprint,
  isCompleted: false,
  summary: null,
  messages: [],
});

export const adapterGeneratedMessageFromDto = (
  dto: GenerationResponseDto,
  id: string,
  responseTimeMs: number
): ChatMessage => ({
  id,
  role: ChatMessageRole.Assistant,
  text: dto.answer,
  debug: {
    responseTimeMs,
    ...(typeof dto.debug?.prompt_tokens === "number" ? { promptTokens: dto.debug.prompt_tokens } : {}),
    ...(typeof dto.debug?.completion_tokens === "number" ? { completionTokens: dto.debug.completion_tokens } : {}),
    sources: dto.sources.map((source) => {
      const filename = source.filename?.trim();

      return filename !== undefined && filename.length > 0 ? `${source.title} (${filename})` : source.title;
    }),
  },
});

export const adapterCreateChatToDto = ({ fingerprint }: CreateChatRequest): CreateChatRequestDto => ({ fingerprint });

export const adapterSendMessageToDto = ({ sessionId, text, debug }: SendMessageRequest): SendMessageRequestDto => ({
  conversation_id: sessionId,
  question: text,
  ...(debug === undefined ? {} : { debug }),
});

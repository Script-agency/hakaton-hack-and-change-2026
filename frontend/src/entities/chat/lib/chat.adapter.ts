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
  messages: dto.messages.flatMap((item) => {
    const message = adapterChatMessageFromDto(item);

    return message === undefined ? [] : [message];
  }),
});

export const adapterCreatedChatFromDto = (dto: ChatCreatedDto): ChatSession => ({
  id: dto.id,
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
    sources: dto.sources.map((source) => source.title),
  },
});

export const adapterCreateChatToDto = ({ fingerprint }: CreateChatRequest): CreateChatRequestDto => ({ fingerprint });

export const adapterSendMessageToDto = ({ sessionId, text, debug }: SendMessageRequest): SendMessageRequestDto => ({
  conversation_id: sessionId,
  question: text,
  ...(debug === undefined ? {} : { debug }),
});

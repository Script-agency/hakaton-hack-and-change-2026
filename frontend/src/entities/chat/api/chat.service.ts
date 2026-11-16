import { $axios } from "@shared/api";

import { adapterCreateChatToDto, adapterSendMessageToDto } from "../lib";
import type {
  ChatCreatedDto,
  ChatDetailDto,
  CreateChatRequest,
  GenerationResponseDto,
  SendMessageRequest,
} from "../types";

const GENERATION_TIMEOUT_MS = 190_000;

class _ChatService {
  private baseUrl = "/generation/chat";
  private client = $axios;

  create(body: CreateChatRequest, signal: AbortSignal) {
    return this.client.post<ChatCreatedDto>(`${this.baseUrl}/new`, adapterCreateChatToDto(body), { signal });
  }

  getById(id: number, signal: AbortSignal) {
    return this.client.get<ChatDetailDto>(`${this.baseUrl}/${id}`, { signal });
  }

  sendMessage(body: SendMessageRequest, signal: AbortSignal) {
    return this.client.post<GenerationResponseDto>(this.baseUrl, adapterSendMessageToDto(body), {
      signal,
      timeout: GENERATION_TIMEOUT_MS,
    });
  }
}

export const ChatService = new _ChatService();

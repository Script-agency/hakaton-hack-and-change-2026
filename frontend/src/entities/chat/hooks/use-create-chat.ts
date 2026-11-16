import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ChatService } from "../api";
import { adapterCreatedChatFromDto } from "../lib";
import { ChatQueryKeys, chatQueryOptions, finishChatRequest } from "../model";
import type { ChatSession, CreateChatVariables } from "../types";

interface CreateChatOptions {
  onSuccess: (chat: ChatSession, variables: CreateChatVariables) => void;
}

export const useCreateChat = ({ onSuccess }: CreateChatOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ChatQueryKeys.create,
    retry: false,
    mutationFn: async ({ fingerprint, controller }: CreateChatVariables) => {
      const { data } = await ChatService.create({ fingerprint }, controller.signal);

      return adapterCreatedChatFromDto(data);
    },
    onSuccess: (chat, variables) => {
      if (variables.controller.signal.aborted) {
        return;
      }

      queryClient.setQueryData(chatQueryOptions(chat.id).queryKey, chat);
      onSuccess(chat, variables);
    },
    onSettled: (_data, _error, { controller }) => finishChatRequest("start", controller),
  });
};

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ChatService } from "../api";
import { adapterGeneratedMessageFromDto } from "../lib";
import { ChatQueryKeys, chatQueryOptions, finishChatRequest } from "../model";
import { ChatMessageRole, type ChatSession, type SendMessageVariables } from "../types";

interface SendMessageOptions {
  onSettled: () => Promise<void>;
}

export const useSendMessage = ({ onSettled }: SendMessageOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ChatQueryKeys.send,
    retry: false,
    mutationFn: async ({ sessionId, text, debug, controller }: SendMessageVariables) => {
      const startedAt = performance.now();
      const { data } = await ChatService.sendMessage({ sessionId, text, debug }, controller.signal);

      return adapterGeneratedMessageFromDto(data, crypto.randomUUID(), performance.now() - startedAt);
    },
    onMutate: async ({ sessionId, text, controller }) => {
      const { queryKey } = chatQueryOptions(sessionId);
      await queryClient.cancelQueries({ queryKey });
      controller.signal.throwIfAborted();
      queryClient.setQueryData<ChatSession>(queryKey, (current) => ({
        id: sessionId,
        messages: [
          ...(current?.messages ?? []),
          {
            id: crypto.randomUUID(),
            role: ChatMessageRole.User,
            text,
          },
        ],
      }));
    },
    onSuccess: (reply, { sessionId, controller }) => {
      if (controller.signal.aborted) {
        return;
      }

      queryClient.setQueryData(chatQueryOptions(sessionId).queryKey, (current) => ({
        id: sessionId,
        messages: [...(current?.messages ?? []), reply],
      }));
    },
    onSettled: async (reply, _error, { sessionId, controller }) => {
      try {
        if (controller.signal.aborted) {
          return;
        }

        const options = chatQueryOptions(sessionId);
        await queryClient.cancelQueries({ queryKey: options.queryKey });
        await queryClient.invalidateQueries({ queryKey: options.queryKey, refetchType: "none" });

        const fresh = await queryClient.fetchQuery(options);

        if (!controller.signal.aborted && reply !== undefined) {
          const answer = [...fresh.messages]
            .reverse()
            .find((message) => message.role === ChatMessageRole.Assistant && message.text === reply.text);
          queryClient.setQueryData(options.queryKey, {
            ...fresh,
            messages: fresh.messages.map((message) =>
              message === answer
                ? {
                    ...message,
                    debug: reply.debug,
                  }
                : message
            ),
          });
        }
      } finally {
        finishChatRequest(sessionId, controller);

        if (!controller.signal.aborted) {
          await onSettled();
        }
      }
    },
  });
};

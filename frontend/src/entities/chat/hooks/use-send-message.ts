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

      return {
        message: adapterGeneratedMessageFromDto(data, crypto.randomUUID(), performance.now() - startedAt),
        isCompleted: data.is_completed,
        summary: data.summary,
      };
    },
    onMutate: async ({ sessionId, text, controller }) => {
      const { queryKey } = chatQueryOptions(sessionId);
      await queryClient.cancelQueries({ queryKey });
      controller.signal.throwIfAborted();
      queryClient.setQueryData<ChatSession>(queryKey, (current) =>
        current === undefined
          ? undefined
          : {
              ...current,
              messages: [
                ...current.messages,
                {
                  id: crypto.randomUUID(),
                  role: ChatMessageRole.User,
                  text,
                },
              ],
            }
      );
    },
    onSuccess: (reply, { sessionId, controller }) => {
      if (controller.signal.aborted) {
        return;
      }

      queryClient.setQueryData(chatQueryOptions(sessionId).queryKey, (current) =>
        current === undefined
          ? undefined
          : {
              ...current,
              isCompleted: reply.isCompleted,
              summary: reply.summary,
              messages: [...current.messages, reply.message],
            }
      );
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
            .find((message) => message.role === ChatMessageRole.Assistant && message.text === reply.message.text);
          queryClient.setQueryData(options.queryKey, {
            ...fresh,
            messages: fresh.messages.map((message) =>
              message === answer
                ? {
                    ...message,
                    debug: reply.message.debug,
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

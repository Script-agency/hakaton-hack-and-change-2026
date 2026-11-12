import { useMutation, useMutationState, useQuery, useQueryClient } from "@tanstack/react-query";

import { ChatMockService } from "../api";
import { createChatSession } from "../lib";
import { resetChatUi, useChatUi } from "../model";
import { ChatMessageRole, type ChatSession } from "../types";

const sessionKey = ["chat", "session"] as const;
let activeRequest: AbortController | null = null;

export const resetChatState = () => {
  activeRequest?.abort();
  activeRequest = null;
  resetChatUi();
};

interface SendMessageVariables {
  sessionId: string;
  text: string;
  turn: number;
  controller: AbortController;
}

export const useChat = () => {
  const queryClient = useQueryClient();

  const { data: session } = useQuery({
    queryKey: sessionKey,
    queryFn: ChatMockService.getSession,
    initialData: createChatSession,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const mutationKey = ["chat", "send-message", session.id] as const;

  const mutationStates = useMutationState({
    filters: { mutationKey, exact: true },
    select: (mutation) => ({ status: mutation.state.status, error: mutation.state.error }),
  });

  const latestMutation = mutationStates.at(-1);
  const error = latestMutation?.error;

  const mutation = useMutation({
    mutationKey,
    mutationFn: ({ text, turn, controller }: SendMessageVariables) =>
      ChatMockService.sendMessage({ text, turn }, controller.signal),
    onSuccess: (message, { sessionId, controller }) => {
      queryClient.setQueryData<ChatSession>(sessionKey, (current) => {
        if (current?.id !== sessionId || controller.signal.aborted) {
          return current;
        }

        return { ...current, messages: [...current.messages, message] };
      });
    },
    onSettled: (_data, _error, { controller }) => {
      if (activeRequest === controller) {
        activeRequest = null;
      }
    },
  });

  const sendMessage = (value: string) => {
    const text = value.trim();
    const current = queryClient.getQueryData<ChatSession>(sessionKey);

    if (text.length === 0 || activeRequest !== null || current === undefined) {
      return;
    }

    const controller = new AbortController();

    activeRequest = controller;
    queryClient.setQueryData<ChatSession>(sessionKey, {
      ...current,
      messages: [...current.messages, { id: crypto.randomUUID(), role: ChatMessageRole.User, text }],
    });
    useChatUi.getState().setDraft("");
    mutation.mutate({
      sessionId: current.id,
      text,
      turn: current.messages.filter((message) => message.role === ChatMessageRole.User).length + 1,
      controller,
    });
  };

  const startNewDialog = () => {
    activeRequest?.abort();
    activeRequest = null;
    queryClient.setQueryData(sessionKey, createChatSession());
    useChatUi.getState().setDraft("");
  };

  return {
    sessionId: session.id,
    messages: session.messages,
    isPending: latestMutation?.status === "pending",
    hasError: error !== undefined && error !== null && error.name !== "AbortError",
    sendMessage,
    startNewDialog,
  };
};

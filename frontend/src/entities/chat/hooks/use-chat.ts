import { useLayoutEffect, useRef } from "react";
import { useMutation, useMutationState, useQuery, useQueryClient } from "@tanstack/react-query";

import { ChatMockService } from "../api";
import { resetChatUi, useChatUi } from "../model";
import { ChatMessageRole, type ChatSession, type ChatSessionKey } from "../types";

const getSessionKey = (id: ChatSessionKey) => ["chat", "session", id] as const;

const activeRequests = new Map<ChatSessionKey, AbortController>();

export const resetChatState = () => {
  activeRequests.forEach((controller) => controller.abort());
  activeRequests.clear();
  ChatMockService.reset();
  resetChatUi();
};

interface SendMessageVariables {
  sessionId: number;
  text: string;
  turn: number;
  controller: AbortController;
}

interface CreateSessionVariables {
  text: string;
  controller: AbortController;
}

export const useChat = (chatId?: number, onSessionCreated?: (id: number) => void, isActive = true) => {
  const queryClient = useQueryClient();
  const creationRequestRef = useRef<AbortController | null>(null);

  const {
    data: session,
    isLoading,
    isError: hasLoadError,
    refetch,
  } = useQuery({
    queryKey: getSessionKey(chatId ?? "start"),
    queryFn: ({ signal }) =>
      chatId === undefined ? Promise.resolve(undefined) : ChatMockService.getSession(chatId, signal),
    enabled: isActive && chatId !== undefined,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useLayoutEffect(() => {
    return () => {
      if (chatId === undefined) {
        const controller = creationRequestRef.current;

        controller?.abort();

        if (activeRequests.get("start") === controller) {
          activeRequests.delete("start");
        }
      }
    };
  }, [chatId, isActive]);

  const mutationStates = useMutationState({
    filters: {
      mutationKey: ["chat", "send-message"],
      exact: true,
      predicate: (mutation) => (mutation.state.variables as SendMessageVariables | undefined)?.sessionId === chatId,
    },
    select: (mutation) => ({ status: mutation.state.status, error: mutation.state.error }),
  });

  const latestMutation = mutationStates.at(-1);

  const saveSession = (current: ChatSession) => {
    queryClient.setQueryData(getSessionKey(current.id), current);
    ChatMockService.recordSession(current);
  };

  const replyMutation = useMutation({
    mutationKey: ["chat", "send-message"],
    mutationFn: ({ text, turn, controller }: SendMessageVariables) =>
      ChatMockService.sendMessage({ text, turn }, controller.signal),
    onSuccess: (message, { sessionId, controller }) => {
      const current = queryClient.getQueryData<ChatSession>(getSessionKey(sessionId));

      if (current !== undefined && !controller.signal.aborted) {
        saveSession({ ...current, messages: [...current.messages, message] });
      }
    },
    onSettled: (_data, _error, { sessionId, controller }) => {
      if (activeRequests.get(sessionId) === controller) {
        activeRequests.delete(sessionId);
      }
    },
  });

  const sendToSession = (current: ChatSession, text: string) => {
    const controller = new AbortController();

    activeRequests.set(current.id, controller);
    saveSession({
      ...current,
      messages: [...current.messages, { id: crypto.randomUUID(), role: ChatMessageRole.User, text }],
    });
    useChatUi.getState().setDraft(chatId ?? "start", "");
    replyMutation.mutate({
      sessionId: current.id,
      text,
      turn: current.messages.filter((message) => message.role === ChatMessageRole.User).length + 1,
      controller,
    });
  };

  const createMutation = useMutation({
    mutationKey: ["chat", "create-session"],
    mutationFn: ({ controller }: CreateSessionVariables) => ChatMockService.createSession(controller.signal),
    onSuccess: (created, { text, controller }) => {
      if (controller.signal.aborted) {
        return;
      }

      sendToSession(created, text);
      onSessionCreated?.(created.id);
    },
    onSettled: (_data, _error, { controller }) => {
      if (activeRequests.get("start") === controller) {
        activeRequests.delete("start");
      }
    },
  });

  const sendMessage = (value: string) => {
    const text = value.trim();

    if (!isActive || text.length === 0 || activeRequests.has(chatId ?? "start")) {
      return;
    }

    if (chatId === undefined) {
      const controller = new AbortController();

      creationRequestRef.current = controller;
      activeRequests.set("start", controller);
      createMutation.mutate({ text, controller });
    } else if (session !== undefined) {
      sendToSession(session, text);
    }
  };

  const sessionId: ChatSessionKey = chatId ?? "start";

  const isCreating = chatId === undefined && createMutation.isPending;
  const error = chatId === undefined ? createMutation.error : latestMutation?.error;

  return {
    isLoading,
    hasLoadError,
    retry: () => {
      void refetch();
    },
    sessionId,
    messages:
      isCreating && createMutation.variables !== undefined
        ? [{ id: "first-message", role: ChatMessageRole.User, text: createMutation.variables.text }]
        : (session?.messages ?? []),
    isPending: isCreating || latestMutation?.status === "pending",
    hasError: error !== undefined && error !== null && error.name !== "AbortError",
    sendMessage,
  };
};

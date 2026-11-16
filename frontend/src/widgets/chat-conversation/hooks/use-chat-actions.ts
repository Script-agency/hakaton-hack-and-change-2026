import { useEffect, useRef } from "react";
import { useMutationState, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import { useCreateChat, useSendMessage } from "@entities/chat/hooks";
import { beginChatRequest, ChatQueryKeys, chatQueryOptions, useChatUi } from "@entities/chat/model";
import { ChatMessageRole, type SendMessageVariables } from "@entities/chat/types";
import { dialogsQueryOptions } from "@entities/dialog/model";

import type { UseChatActionsOptions } from "../types";

export const useChatActions = ({ chat, fingerprint, isActive }: UseChatActionsOptions) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const creationRequestRef = useRef<AbortController | null>(null);
  const chatId = chat?.id;

  const invalidateDialogs = () =>
    queryClient.invalidateQueries({
      queryKey: dialogsQueryOptions(fingerprint).queryKey,
    });

  const send = useSendMessage({ onSettled: invalidateDialogs });

  const sendToSession = (sessionId: number, text: string) => {
    if (queryClient.getQueryData(chatQueryOptions(sessionId).queryKey)?.isCompleted === true) {
      return;
    }

    const controller = beginChatRequest(sessionId);

    if (controller === undefined) {
      return;
    }

    useChatUi.getState().setDraft(chatId ?? "start", "");
    send.mutate({ sessionId, text, controller, debug: useChatUi.getState().isDebugEnabled });
  };

  const create = useCreateChat({
    onSuccess: (created, { text, controller }) => {
      if (controller.signal.aborted) {
        return;
      }

      sendToSession(created.id, text);
      void navigate(`/chats/${created.id}`, { replace: true });
      void invalidateDialogs();
    },
  });

  useEffect(
    () => () => {
      creationRequestRef.current?.abort();
    },
    [isActive, chatId]
  );

  const sendStates = useMutationState({
    filters: { mutationKey: ChatQueryKeys.send, exact: true },
    select: (mutation) => ({
      status: mutation.state.status,
      variables: mutation.state.variables as SendMessageVariables | undefined,
    }),
  });

  const latestSend = sendStates.filter((state) => state.variables?.sessionId === chatId).at(-1);

  const isCreating = chatId === undefined && create.isPending;
  const isSending = latestSend?.status === "pending";

  const sendMessage = (value: string) => {
    const text = value.trim();

    if (!isActive || chat?.isCompleted === true || text.length === 0 || isCreating || isSending) {
      return;
    }

    if (chatId === undefined) {
      const controller = beginChatRequest("start");

      if (controller === undefined) {
        return;
      }

      creationRequestRef.current = controller;
      create.mutate({ fingerprint, text, controller });
    } else {
      sendToSession(chatId, text);
    }
  };

  const creationFailed = chatId === undefined && create.isError && create.variables?.controller.signal.aborted !== true;
  const sendFailed = latestSend?.status === "error" && latestSend.variables?.controller.signal.aborted !== true;

  const messages =
    isCreating && create.variables !== undefined
      ? [{ id: "first-message", role: ChatMessageRole.User, text: create.variables.text }]
      : (chat?.messages ?? []);

  const errorMessage = creationFailed
    ? "Не удалось создать чат. Попробуйте ещё раз."
    : sendFailed
      ? "Не удалось получить ответ. Можно отправить новый вопрос."
      : undefined;

  return { messages, isPending: isCreating || isSending, errorMessage, sendMessage };
};

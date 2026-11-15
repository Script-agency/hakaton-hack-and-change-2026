import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router";

import { LeadRequestForm } from "@features/lead-request";

import { parseChatId } from "@entities/chat/lib";
import { chatQueryOptions } from "@entities/chat/model";

import { LoadingState } from "@shared/ui";

import { LeadPageError } from "./lead-page-error";

interface LeadPageProps {
  isActive: boolean;
}

export const LeadPage = ({ isActive }: LeadPageProps) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rawChatId = params.get("chatId");
  const chatId = parseChatId(rawChatId ?? undefined);
  const hasInvalidId = rawChatId !== null && chatId === undefined;

  const chat = useQuery({
    ...chatQueryOptions(chatId ?? 0),
    enabled: isActive && chatId !== undefined,
  });

  if (hasInvalidId || (chatId !== undefined && chat.isError)) {
    return <LeadPageError error={chat.error} hasInvalidId={hasInvalidId} onRetry={() => void chat.refetch()} />;
  }

  if (chatId !== undefined && chat.data === undefined) {
    return <LoadingState label="Загружаю переписку…" />;
  }

  return (
    <LeadRequestForm
      isActive={isActive}
      messages={chat.data?.messages ?? []}
      onSuccess={() => void navigate("/lead/sent", { replace: true })}
    />
  );
};

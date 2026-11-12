import { AnimatePresence } from "framer-motion";

import { DebugModeSwitch } from "@features/debug-mode";
import { MessageComposer } from "@features/send-message";

import { useChat } from "@entities/chat/hooks";
import { useChatUi } from "@entities/chat/model";
import { ChatMessageRole, type ChatMessage as ChatMessageData } from "@entities/chat/types";
import { ChatMessage } from "@entities/chat/ui";

import { Collapse, LoadingState } from "@shared/ui";

import { useChatScroll } from "../../hooks";
import { ChatError } from "../chat-error";
import { ChatLoadError } from "../chat-load-error";
import { ChatPending } from "../chat-pending";
import { SuggestedQuestions } from "../suggested-questions";
import styles from "./chat-conversation.module.scss";

const greeting: ChatMessageData = {
  id: "greeting",
  role: ChatMessageRole.Assistent,
  text:
    "Здравствуйте! Я ИИ-помощник Energytool. Помогу разобраться с учётом электроэнергии " +
    "и подобрать решение. С чего начнём?",
};

interface ChatConversationProps {
  chatId?: number;
  isActive: boolean;
  onSessionCreated?: (id: number) => void;
}

export const ChatConversation = ({ chatId, isActive, onSessionCreated }: ChatConversationProps) => {
  const { sessionId, messages, isLoading, hasLoadError, retry, isPending, hasError, sendMessage } = useChat(
    chatId,
    onSessionCreated,
    isActive
  );

  const isDebugAvailable = useChatUi((state) => state.isDebugAvailable);

  const isDebugEnabled = useChatUi((state) => state.isDebugEnabled);

  const { viewportRef, contentRef, onScroll } = useChatScroll({
    messages,
    isPending,
    isDebugEnabled,
    isReady: !isLoading && !hasLoadError,
  });
  const hasMessages = messages.length > 0;

  if (isLoading) {
    return <LoadingState label="Загружаю сообщения…" />;
  }

  if (hasLoadError) {
    return <ChatLoadError onRetry={retry} />;
  }

  return (
    <div className={styles.conversation}>
      <Collapse isOpen={hasMessages && isDebugAvailable}>
        <DebugModeSwitch />
      </Collapse>
      <div ref={viewportRef} className={styles.viewport} onScroll={onScroll}>
        <div ref={contentRef} className={styles.thread}>
          <div aria-label="Сообщения чата" aria-live="polite" aria-relevant="additions text" role="log">
            <ol className={styles.messages}>
              <AnimatePresence initial={false}>
                <ChatMessage key={greeting.id} message={greeting} showDebug={false} />
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} showDebug={isDebugEnabled} />
                ))}
              </AnimatePresence>
            </ol>
          </div>
          <ChatPending isPending={isPending} />
          <ChatError hasError={hasError} />
        </div>
        {!hasMessages ? <SuggestedQuestions onSelect={sendMessage} /> : null}
      </div>
      <MessageComposer isActive={isActive} isPending={isPending} onSend={sendMessage} sessionId={sessionId} />
    </div>
  );
};

import { AnimatePresence } from "framer-motion";

import { DebugModeSwitch } from "@features/debug-mode";
import { LeadRequestButton } from "@features/lead-request";
import { MessageComposer } from "@features/send-message";

import { useChatUi } from "@entities/chat/model";
import { ChatMessageRole, type ChatMessage as ChatMessageData, type ChatSession } from "@entities/chat/types";
import { ChatMessage } from "@entities/chat/ui";

import { Collapse } from "@shared/ui";

import { useChatActions, useChatScroll } from "../../hooks";
import { ChatError } from "../chat-error";
import { ChatPending } from "../chat-pending";
import { SuggestedQuestions } from "../suggested-questions";
import styles from "./chat-conversation.module.scss";

const greeting: ChatMessageData = {
  id: "greeting",
  role: ChatMessageRole.Assistant,
  text:
    "Здравствуйте! Я ИИ-помощник Energytool. Помогу разобраться с учётом электроэнергии " +
    "и подобрать решение. С чего начнём?",
};

interface ChatConversationProps {
  chat?: ChatSession;
  fingerprint: string;
  isActive: boolean;
}

export const ChatConversation = ({ chat, fingerprint, isActive }: ChatConversationProps) => {
  const { messages, isPending, errorMessage, sendMessage } = useChatActions({ chat, fingerprint, isActive });

  const isDebugAvailable = useChatUi((state) => state.isDebugAvailable);

  const isDebugEnabled = useChatUi((state) => state.isDebugEnabled);

  const { viewportRef, contentRef, onScroll } = useChatScroll({
    messages,
    isPending,
    isDebugEnabled,
    isReady: true,
  });
  const hasMessages = messages.length > 0;

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
          <ChatError hasError={errorMessage !== undefined} message={errorMessage} />
        </div>
        {!hasMessages ? <SuggestedQuestions onSelect={sendMessage} /> : null}
      </div>
      {chat?.isCompleted === true ? <LeadRequestButton chatId={chat.id} disabled={!isActive || isPending} /> : null}
      {chat?.isCompleted !== true ? (
        <MessageComposer
          isActive={isActive}
          isPending={isPending}
          onSend={sendMessage}
          sessionId={chat?.id ?? "start"}
        />
      ) : null}
    </div>
  );
};

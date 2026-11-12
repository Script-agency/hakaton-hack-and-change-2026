import { DebugModeSwitch } from "@features/debug-mode";
import { MessageComposer } from "@features/send-message";

import { useChat } from "@entities/chat/hooks";
import { useChatUi } from "@entities/chat/model";
import { ChatMessageRole, type ChatMessage as ChatMessageData } from "@entities/chat/types";
import { ChatMessage } from "@entities/chat/ui";

import { Collapse } from "@shared/ui";

import { useChatScroll } from "../../hooks";
import { ChatError } from "../chat-error";
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

export const ChatConversation = () => {
  const { sessionId, messages, isPending, hasError, sendMessage } = useChat();

  const isDebugAvailable = useChatUi((state) => state.isDebugAvailable);

  const isDebugEnabled = useChatUi((state) => state.isDebugEnabled);

  const { viewportRef, contentRef, onScroll } = useChatScroll({ messages, isPending, isDebugEnabled });
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
              <ChatMessage message={greeting} showDebug={false} />
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} showDebug={isDebugEnabled} />
              ))}
            </ol>
          </div>
          <ChatPending isPending={isPending} />
          <ChatError hasError={hasError} />
        </div>
        {!hasMessages ? <SuggestedQuestions onSelect={sendMessage} /> : null}
      </div>
      <MessageComposer isPending={isPending} onSend={sendMessage} sessionId={sessionId} />
    </div>
  );
};

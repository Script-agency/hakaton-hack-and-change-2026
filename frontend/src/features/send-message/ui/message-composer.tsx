import type { FormEvent, KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";

import { useChatUi } from "@entities/chat/model";
import type { ChatSessionKey } from "@entities/chat/types";

import { useTextareaAutosize } from "@shared/hooks";

import styles from "./message-composer.module.scss";

interface MessageComposerProps {
  sessionId: ChatSessionKey;
  isActive: boolean;
  isPending: boolean;
  onSend: (text: string) => void;
}

export const MessageComposer = ({ sessionId, isActive, isPending, onSend }: MessageComposerProps) => {
  const draft = useChatUi((state) => state.drafts[sessionId] ?? "");

  const updateDraft = useChatUi((state) => state.setDraft);

  const setDraft = (value: string) => updateDraft(sessionId, value);

  const textareaRef = useTextareaAutosize(draft);
  const isDisabled = !isActive || isPending || draft.trim().length === 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isDisabled) {
      onSend(draft);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <form aria-label="Отправить сообщение" className={styles.composer} onSubmit={handleSubmit}>
      <div className={styles.controls}>
        <textarea
          ref={textareaRef}
          aria-label="Сообщение"
          className={styles.input}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Сообщение"
          rows={1}
          value={draft}
        />

        <button
          aria-label="Отправить сообщение"
          className={styles.send}
          disabled={isDisabled}
          title={isPending ? "Дождитесь ответа" : isDisabled ? "Введите сообщение" : "Отправить сообщение"}
          type="submit"
        >
          <ArrowUp aria-hidden="true" size={20} strokeWidth={2} />
        </button>
      </div>
    </form>
  );
};

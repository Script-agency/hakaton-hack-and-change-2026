import type { FormEvent, KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";

import { useChatUi } from "@entities/chat/model";
import type { ChatSessionKey } from "@entities/chat/types";

import { useTextareaAutosize } from "@shared/hooks";
import { Collapse } from "@shared/ui";

import { useVoiceInput } from "../hooks";
import styles from "./message-composer.module.scss";
import { VoiceInputButton } from "./voice-input-button";

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

  const isPanelOpen = useChatUi((state) => state.isPanelOpen);

  const voice = useVoiceInput({
    value: draft,
    onChange: setDraft,
    enabled: isActive && isPanelOpen && !isPending,
    sessionId,
  });

  const textareaRef = useTextareaAutosize(draft);
  const isDisabled = !isActive || isPending || voice.isActive || draft.trim().length === 0;

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
      <Collapse isOpen={voice.error !== null}>
        <p className={styles.error} role="alert">
          {voice.error}
        </p>
      </Collapse>
      <span className={styles.recordingStatus} role="status">
        {voice.isActive ? (voice.isStopping ? "Завершаю диктовку" : "Идёт голосовой ввод") : ""}
      </span>
      <div className={styles.controls}>
        <textarea
          ref={textareaRef}
          aria-label="Сообщение"
          className={styles.input}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Сообщение"
          readOnly={voice.isActive}
          rows={1}
          value={draft}
        />

        <VoiceInputButton
          disabled={!isActive || isPending}
          isActive={voice.isActive}
          isStopping={voice.isStopping}
          isSupported={voice.isSupported}
          onToggle={voice.toggle}
        />
        <button
          aria-label="Отправить сообщение"
          className={styles.send}
          disabled={isDisabled}
          title={
            isPending
              ? "Дождитесь ответа"
              : voice.isActive
                ? "Остановите диктовку перед отправкой"
                : isDisabled
                  ? "Введите сообщение"
                  : "Отправить сообщение"
          }
          type="submit"
        >
          <ArrowUp aria-hidden="true" size={20} strokeWidth={2} />
        </button>
      </div>
    </form>
  );
};

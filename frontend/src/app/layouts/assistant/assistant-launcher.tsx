import type { Ref } from "react";
import { MessageCircle, X } from "lucide-react";

import styles from "./assistant-layout.module.scss";

interface AssistantLauncherProps {
  buttonRef: Ref<HTMLButtonElement>;
  isOpen: boolean;
  onClick: () => void;
  panelId: string;
}

export const AssistantLauncher = ({ buttonRef, isOpen, onClick, panelId }: AssistantLauncherProps) => {
  const Icon = isOpen ? X : MessageCircle;

  return (
    <button
      ref={buttonRef}
      aria-controls={panelId}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      aria-label={isOpen ? "Закрыть ИИ-помощника" : "Открыть ИИ-помощника"}
      className={styles.launcher}
      onClick={onClick}
      title={isOpen ? "Закрыть ИИ-помощника" : "Открыть ИИ-помощника"}
      type="button"
    >
      <Icon aria-hidden="true" size={26} strokeWidth={1.8} />
    </button>
  );
};

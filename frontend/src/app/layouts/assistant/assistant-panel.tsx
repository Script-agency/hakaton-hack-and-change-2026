import type { KeyboardEvent, PropsWithChildren, Ref } from "react";
import * as m from "framer-motion/m";
import { X } from "lucide-react";

import styles from "./assistant-layout.module.scss";
import { panelVariants } from "./assistant-motion";

interface AssistantPanelProps extends PropsWithChildren {
  closeButtonRef: Ref<HTMLButtonElement>;
  id: string;
  isOpen: boolean;
  onClose: () => void;
  onShow: () => void;
}

export const AssistantPanel = ({ children, closeButtonRef, id, isOpen, onClose, onShow }: AssistantPanelProps) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  };

  return (
    <m.section
      animate={isOpen ? "open" : "closed"}
      aria-hidden={!isOpen}
      aria-label="ИИ-помощник"
      className={styles.panel}
      id={id}
      inert={!isOpen}
      initial={false}
      onAnimationComplete={() => {
        if (isOpen) {
          onShow();
        }
      }}
      onKeyDown={handleKeyDown}
      role="dialog"
      style={{ pointerEvents: isOpen ? "auto" : "none" }}
      variants={panelVariants}
    >
      <header className={styles.header}>
        <button
          ref={closeButtonRef}
          aria-label="Закрыть ИИ-помощника"
          className={styles.closeButton}
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={20} strokeWidth={1.8} />
        </button>
      </header>
      <div className={styles.content}>{children}</div>
    </m.section>
  );
};

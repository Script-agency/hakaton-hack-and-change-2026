import type { Ref } from "react";
import * as m from "framer-motion/m";
import { MessageCircle } from "lucide-react";

import styles from "./assistant-layout.module.scss";
import { launcherVariants } from "./assistant-motion";

interface AssistantLauncherProps {
  buttonRef: Ref<HTMLButtonElement>;
  isOpen: boolean;
  onClick: () => void;
  onShow: () => void;
  panelId: string;
}

export const AssistantLauncher = ({ buttonRef, isOpen, onClick, onShow, panelId }: AssistantLauncherProps) => {
  return (
    <m.button
      ref={buttonRef}
      animate={isOpen ? "hidden" : "visible"}
      aria-controls={panelId}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      aria-hidden={isOpen}
      aria-label="Открыть ИИ-помощника"
      className={styles.launcher}
      inert={isOpen}
      initial={false}
      onAnimationComplete={() => {
        if (!isOpen) {
          onShow();
        }
      }}
      onClick={onClick}
      style={{ pointerEvents: isOpen ? "none" : "auto" }}
      type="button"
      variants={launcherVariants}
    >
      <MessageCircle aria-hidden="true" size={26} strokeWidth={1.8} />
    </m.button>
  );
};

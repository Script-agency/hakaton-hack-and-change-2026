import type { PropsWithChildren, Ref } from "react";
import * as m from "framer-motion/m";

import styles from "./assistant-layout.module.scss";
import { panelVariants } from "./assistant-motion";

interface AssistantPanelProps extends PropsWithChildren {
  id: string;
  isOpen: boolean;
  onShow: () => void;
  panelRef: Ref<HTMLElement>;
}

export const AssistantPanel = ({ children, id, isOpen, onShow, panelRef }: AssistantPanelProps) => {
  return (
    <m.section
      ref={panelRef}
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
      role="dialog"
      style={{ pointerEvents: isOpen ? "auto" : "none" }}
      tabIndex={-1}
      variants={panelVariants}
    >
      <div className={styles.content}>{children}</div>
    </m.section>
  );
};

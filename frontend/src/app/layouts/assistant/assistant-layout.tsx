import { useId, useRef, useState, type KeyboardEvent, type PropsWithChildren } from "react";

import { AssistantLauncher } from "./assistant-launcher";
import styles from "./assistant-layout.module.scss";
import { AssistantPanel } from "./assistant-panel";

export const AssistantLayout = ({ children }: PropsWithChildren) => {
  const [isOpen, setIsOpen] = useState(false);

  const panelId = useId();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  const closePanel = () => {
    setIsOpen(false);
    launcherRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isOpen && event.key === "Escape") {
      event.stopPropagation();
      closePanel();
    }
  };

  return (
    <div className={styles.layout} onKeyDown={handleKeyDown}>
      <AssistantLauncher
        buttonRef={launcherRef}
        isOpen={isOpen}
        onClick={() => {
          if (isOpen) {
            closePanel();
          } else {
            setIsOpen(true);
          }
        }}
        panelId={panelId}
      />
      <AssistantPanel id={panelId} isOpen={isOpen} onShow={() => panelRef.current?.focus()} panelRef={panelRef}>
        {children}
      </AssistantPanel>
    </div>
  );
};

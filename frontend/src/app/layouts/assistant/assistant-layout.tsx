import { useId, useRef, useState, type PropsWithChildren } from "react";

import { AssistantLauncher } from "./assistant-launcher";
import styles from "./assistant-layout.module.scss";
import { AssistantPanel } from "./assistant-panel";

export const AssistantLayout = ({ children }: PropsWithChildren) => {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const hasOpened = useRef(false);

  const openPanel = () => {
    hasOpened.current = true;
    setIsOpen(true);
  };

  const focusLauncher = () => {
    if (hasOpened.current) {
      launcherRef.current?.focus();
    }
  };

  return (
    <div className={styles.layout}>
      <AssistantLauncher
        buttonRef={launcherRef}
        isOpen={isOpen}
        onClick={openPanel}
        onShow={focusLauncher}
        panelId={panelId}
      />
      <AssistantPanel
        closeButtonRef={closeButtonRef}
        id={panelId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onShow={() => closeButtonRef.current?.focus()}
      >
        {children}
      </AssistantPanel>
    </div>
  );
};

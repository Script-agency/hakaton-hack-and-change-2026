import { useId } from "react";

import { useChatUi } from "@entities/chat/model";

import styles from "./debug-mode-switch.module.scss";

export const DebugModeSwitch = () => {
  const labelId = useId();

  const isDebugEnabled = useChatUi((state) => state.isDebugEnabled);

  const setDebugEnabled = useChatUi((state) => state.setDebugEnabled);

  return (
    <div className={styles.row}>
      <span className={styles.label} id={labelId}>
        Режим отладки
      </span>

      <button
        aria-checked={isDebugEnabled}
        aria-labelledby={labelId}
        className={styles.switch}
        onClick={() => setDebugEnabled(!isDebugEnabled)}
        role="switch"
        title={isDebugEnabled ? "Выключить режим отладки" : "Включить режим отладки"}
        type="button"
      >
        <span className={styles.thumb} />
      </button>
    </div>
  );
};

import { useReducedMotion } from "framer-motion";
import * as m from "framer-motion/m";

import { Collapse } from "@shared/ui";

import styles from "./chat-pending.module.scss";

interface ChatPendingProps {
  isPending: boolean;
}

const dotDelays = [0, 0.15, 0.3];

export const ChatPending = ({ isPending }: ChatPendingProps) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <Collapse isOpen={isPending}>
      <p className={styles.pending} role="status">
        Готовлю ответ
        <span aria-hidden="true" className={styles.dots}>
          {dotDelays.map((delay) => (
            <m.span
              key={delay}
              animate={{ y: shouldReduceMotion === true ? 0 : [0, -3, 0, 0] }}
              className={styles.dot}
              transition={
                shouldReduceMotion === true
                  ? { duration: 0 }
                  : { duration: 0.9, delay, repeat: Infinity, ease: "easeInOut", times: [0, 0.25, 0.5, 1] }
              }
            >
              •
            </m.span>
          ))}
        </span>
      </p>
    </Collapse>
  );
};

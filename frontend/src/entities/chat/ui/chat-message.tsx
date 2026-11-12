import clsx from "clsx";
import { useReducedMotion } from "framer-motion";
import * as m from "framer-motion/m";

import { Collapse } from "@shared/ui";

import { ChatMessageRole, type ChatMessage as ChatMessageData } from "../types";
import styles from "./chat-message.module.scss";

interface ChatMessageProps {
  message: ChatMessageData;
  showDebug: boolean;
}

const responseTimeFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });

export const ChatMessage = ({ message, showDebug }: ChatMessageProps) => {
  const isUser = message.role === ChatMessageRole.User;
  const shouldReduceMotion = useReducedMotion();

  return (
    <m.li
      animate={{ height: "auto", opacity: 1, y: 0 }}
      className={styles.message}
      initial={shouldReduceMotion === true ? false : { height: 0, opacity: 0, y: 8 }}
      transition={shouldReduceMotion === true ? { duration: 0 } : undefined}
    >
      <div className={clsx(styles.body, isUser && styles.user)}>
        <p aria-label={`${isUser ? "Вы" : "ИИ-помощник"}: ${message.text}`} className={styles.bubble}>
          {message.text}
        </p>
        <Collapse className={styles.debugReveal} isOpen={!isUser && showDebug && message.debug !== undefined}>
          {message.debug !== undefined ? (
            <div className={styles.debugSpacing}>
              <p className={styles.debug}>
                Ответ за {responseTimeFormat.format(message.debug.responseTimeMs / 1000)} с
                {message.debug.sources.length > 0
                  ? ` · Источники: ${message.debug.sources.map((source) => `«${source}»`).join(", ")}`
                  : null}
              </p>
            </div>
          ) : null}
        </Collapse>
      </div>
    </m.li>
  );
};

import { useEffect, useLayoutEffect, useRef, type UIEvent } from "react";

import { ChatMessageRole, type ChatMessage } from "@entities/chat/types";

interface UseChatScrollOptions {
  messages: readonly ChatMessage[];
  isPending: boolean;
  isDebugEnabled: boolean;
}

export const useChatScroll = ({ messages, isPending, isDebugEnabled }: UseChatScrollOptions) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const shouldFollow = useRef(true);
  const hasMessages = messages.length > 0;

  useLayoutEffect(() => {
    const viewport = viewportRef.current;

    if (viewport !== null && (shouldFollow.current || messages.at(-1)?.role === ChatMessageRole.User || !hasMessages)) {
      viewport.scrollTop = viewport.scrollHeight;
      shouldFollow.current = true;
    }
  }, [messages, isPending, isDebugEnabled, hasMessages]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;

    if (viewport === null || content === null) {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (shouldFollow.current) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    });

    observer.observe(viewport);
    observer.observe(content);

    return () => observer.disconnect();
  }, []);

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const viewport = event.currentTarget;

    shouldFollow.current = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 48;
  };

  return { viewportRef, contentRef, onScroll: handleScroll };
};

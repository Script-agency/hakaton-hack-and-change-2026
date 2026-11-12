import { useLayoutEffect, useRef } from "react";

export const useTextareaAutosize = (value: string) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;

    if (textarea !== null) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);

  return textareaRef;
};

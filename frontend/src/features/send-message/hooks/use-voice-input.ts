import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { getVoiceDraft, getVoiceInputError, getVoiceRecognitionConstructor } from "../lib";
import type { UseVoiceInputOptions, VoiceRecognition } from "../types";

export const useVoiceInput = ({ value, onChange, enabled, sessionId }: UseVoiceInputOptions) => {
  const recognitionRef = useRef<VoiceRecognition | null>(null);
  const baseDraftRef = useRef("");
  const expectedDraftRef = useRef(value);
  const sessionRef = useRef(sessionId);
  const onChangeRef = useRef(onChange);
  const [isActive, setIsActive] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isSupported] = useState(
    () => typeof window !== "undefined" && window.isSecureContext && getVoiceRecognitionConstructor() !== undefined
  );

  const dispose = useCallback(() => {
    const recognition = recognitionRef.current;

    recognitionRef.current = null;

    if (recognition === null) {
      return;
    }

    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;

    try {
      recognition.abort();
    } catch {
      // The browser may already have stopped the recognition service.
    }
  }, []);

  const cancel = useCallback(() => {
    dispose();
    setIsActive(false);
    setIsStopping(false);
  }, [dispose]);

  useLayoutEffect(() => {
    onChangeRef.current = onChange;

    if (
      recognitionRef.current !== null &&
      (!enabled || sessionRef.current !== sessionId || value !== expectedDraftRef.current)
    ) {
      cancel();
    }
  }, [value, onChange, enabled, sessionId, cancel]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancel();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      dispose();
    };
  }, [cancel, dispose]);

  const start = () => {
    const Recognition = getVoiceRecognitionConstructor();

    if (!enabled || !isSupported || Recognition === undefined || recognitionRef.current !== null) {
      return;
    }

    setError(null);
    baseDraftRef.current = value;
    expectedDraftRef.current = value;
    sessionRef.current = sessionId;

    try {
      const recognition = new Recognition();

      recognitionRef.current = recognition;
      recognition.lang = "ru-RU";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        if (recognitionRef.current !== recognition) {
          return;
        }

        const draft = getVoiceDraft(baseDraftRef.current, event.results);

        expectedDraftRef.current = draft;
        onChangeRef.current(draft);
      };
      recognition.onerror = (event) => {
        if (recognitionRef.current !== recognition) {
          return;
        }

        setError(getVoiceInputError(event.error));
        cancel();
      };
      recognition.onend = () => {
        if (recognitionRef.current === recognition) {
          cancel();
        }
      };
      setIsActive(true);
      recognition.start();
    } catch {
      setError(getVoiceInputError("unknown"));
      cancel();
    }
  };

  const stop = () => {
    if (recognitionRef.current === null || isStopping) {
      return;
    }

    setIsStopping(true);

    try {
      recognitionRef.current.stop();
    } catch {
      setError(getVoiceInputError("unknown"));
      cancel();
    }
  };

  const toggle = () => {
    if (recognitionRef.current !== null) {
      stop();
    } else {
      start();
    }
  };

  return { isSupported, isActive, isStopping, error, toggle };
};

import type { ChatSessionKey } from "@entities/chat/types";

export interface VoiceRecognitionResult {
  readonly isFinal: boolean;
  readonly [index: number]: { readonly transcript: string } | undefined;
}

export interface VoiceRecognitionResultEvent {
  readonly results: ArrayLike<VoiceRecognitionResult>;
}

export interface VoiceRecognitionErrorEvent {
  readonly error: string;
}

export interface VoiceRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: VoiceRecognitionResultEvent) => void) | null;
  onerror: ((event: VoiceRecognitionErrorEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export interface VoiceRecognitionConstructor {
  new (): VoiceRecognition;
}

export interface VoiceRecognitionWindow extends Window {
  SpeechRecognition?: VoiceRecognitionConstructor;
  webkitSpeechRecognition?: VoiceRecognitionConstructor;
}

export interface UseVoiceInputOptions {
  value: string;
  onChange: (value: string) => void;
  enabled: boolean;
  sessionId: ChatSessionKey;
}

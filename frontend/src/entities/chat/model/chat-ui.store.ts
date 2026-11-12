import { create } from "zustand";

import type { ChatSessionKey } from "../types";

export interface ChatUiState {
  isPanelOpen: boolean;
  isDebugAvailable: boolean;
  isDebugEnabled: boolean;
  drafts: Record<string, string>;
  setDebugEnabled: (enabled: boolean) => void;
  setDraft: (sessionId: ChatSessionKey, draft: string) => void;
  setPanelOpen: (isPanelOpen: boolean) => void;
}

export const useChatUi = create<ChatUiState>()((set) => ({
  isPanelOpen: false,
  isDebugAvailable: false,
  isDebugEnabled: false,
  drafts: {},
  setDebugEnabled: (isDebugEnabled) => set({ isDebugEnabled }),
  setDraft: (sessionId, draft) => set((state) => ({ drafts: { ...state.drafts, [sessionId]: draft } })),
  setPanelOpen: (isPanelOpen) => set({ isPanelOpen }),
}));

export const configureChatDebug = (debug: boolean) => {
  useChatUi.setState({ isDebugAvailable: debug, isDebugEnabled: debug });
};

export const resetChatUi = () => {
  useChatUi.setState({ isPanelOpen: false, isDebugAvailable: false, isDebugEnabled: false, drafts: {} });
};

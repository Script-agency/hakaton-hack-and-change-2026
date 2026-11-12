import { create } from "zustand";

export interface ChatUiState {
  isPanelOpen: boolean;
  isDebugEnabled: boolean;
  draft: string;
  setDebugEnabled: (enabled: boolean) => void;
  setDraft: (draft: string) => void;
  setPanelOpen: (isPanelOpen: boolean) => void;
}

export const useChatUi = create<ChatUiState>()((set) => ({
  isPanelOpen: false,
  isDebugEnabled: false,
  draft: "",
  setDebugEnabled: (isDebugEnabled) => set({ isDebugEnabled }),
  setDraft: (draft) => set({ draft }),
  setPanelOpen: (isPanelOpen) => set({ isPanelOpen }),
}));

export const resetChatUi = () => {
  useChatUi.setState({ isPanelOpen: false, isDebugEnabled: false, draft: "" });
};

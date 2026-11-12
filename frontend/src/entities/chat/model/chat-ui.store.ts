import { create } from "zustand";

export interface ChatUiState {
  isDebugEnabled: boolean;
  draft: string;
  setDebugEnabled: (enabled: boolean) => void;
  setDraft: (draft: string) => void;
}

export const useChatUi = create<ChatUiState>()((set) => ({
  isDebugEnabled: false,
  draft: "",
  setDebugEnabled: (isDebugEnabled) => set({ isDebugEnabled }),
  setDraft: (draft) => set({ draft }),
}));

export const resetChatUi = () => {
  useChatUi.setState({ isDebugEnabled: false, draft: "" });
};

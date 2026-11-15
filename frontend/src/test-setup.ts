import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import { resetChatState } from "@entities/chat/model";
import { resetLeadState } from "@entities/lead/model";

vi.stubGlobal(
  "matchMedia",
  vi.fn().mockImplementation((query: string): MediaQueryList => ({
    matches: query === "(prefers-reduced-motion)",
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: () => true,
  }))
);
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);
Element.prototype.scrollTo = vi.fn();

afterEach(() => {
  cleanup();
  resetChatState();
  resetLeadState();
  vi.useRealTimers();
});

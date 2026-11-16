import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { ChatMessageRole, type ChatMessage as Message } from "../types";
import { ChatMessage } from "./chat-message";

const message: Message = {
  id: "reply",
  role: ChatMessageRole.Assistant,
  text: "Ответ",
  debug: { responseTimeMs: 1250, promptTokens: 42, completionTokens: 128, sources: [] },
};

test("debug shows separate input and output token counts", () => {
  render(
    <ul>
      <ChatMessage message={message} showDebug />
    </ul>
  );
  expect(screen.getByText(/Токены на входе: 42.*Токены на выходе: 128/)).toBeVisible();
});

test("zero token counts are displayed, missing values are omitted", () => {
  const view = render(
    <ul>
      <ChatMessage
        message={{ ...message, debug: { responseTimeMs: 1, promptTokens: 0, completionTokens: 0, sources: [] } }}
        showDebug
      />
    </ul>
  );
  expect(screen.getByText(/Токены на входе: 0.*Токены на выходе: 0/)).toBeVisible();
  view.rerender(
    <ul>
      <ChatMessage message={{ ...message, debug: { responseTimeMs: 1, sources: [] } }} showDebug />
    </ul>
  );
  expect(screen.queryByText(/Токены на/)).not.toBeInTheDocument();
});

test("token diagnostics are hidden when debug is switched off", () => {
  render(
    <ul>
      <ChatMessage message={message} showDebug={false} />
    </ul>
  );
  expect(screen.queryByText(/Токены на входе: 42/)).not.toBeInTheDocument();
});

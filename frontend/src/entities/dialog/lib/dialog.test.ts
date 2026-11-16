import { QueryClient } from "@tanstack/react-query";
import { expect, test, vi } from "vitest";

import { DialogService } from "../api";
import { dialogsQueryOptions } from "../model";
import { adapterDialogFromDto } from "./dialog.adapter";
import { formatMessageCount } from "./format-message-count";

test("message counts use Russian plural forms", () => {
  for (const [count, expected] of [
    [1, "1 сообщение"],
    [2, "2 сообщения"],
    [5, "5 сообщений"],
    [11, "11 сообщений"],
    [21, "21 сообщение"],
  ] as const) {
    expect(formatMessageCount(count)).toBe(expected);
  }
});

test("history cache and request are scoped to the visitor and retain completion", async () => {
  const dto = {
    id: 42,
    fingerprint: "visitor-a",
    created_at: "2026-11-15T10:00:00Z",
    message_count: 2,
    is_completed: true,
    summary: "Summary",
  };
  const get = vi.spyOn(DialogService, "getAll").mockResolvedValue({
    data: [dto],
    status: 200,
    statusText: "OK",
    headers: {},
    config: { headers: new (await import("axios")).AxiosHeaders() },
  });
  const client = new QueryClient();

  try {
    const options = dialogsQueryOptions("visitor-a");
    expect(await client.fetchQuery(options)).toEqual([adapterDialogFromDto(dto)]);
    expect(get).toHaveBeenCalledWith("visitor-a", expect.any(AbortSignal));
    expect(options.queryKey).not.toEqual(dialogsQueryOptions("visitor-b").queryKey);
    client.setQueryData(dialogsQueryOptions("visitor-b").queryKey, []);
    await client.invalidateQueries({ queryKey: options.queryKey });
    expect(client.getQueryState(options.queryKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(dialogsQueryOptions("visitor-b").queryKey)?.isInvalidated).toBe(false);
  } finally {
    client.clear();
  }
});

export const ChatQueryKeys = {
  detail: (id: number) => ["chat", "detail", id] as const,
  create: ["chat", "create"] as const,
  send: ["chat", "send"] as const,
};

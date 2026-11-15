export class ChatNotFoundError extends Error {
  constructor() {
    super("Чат не найден.");
    this.name = "ChatNotFoundError";
  }
}

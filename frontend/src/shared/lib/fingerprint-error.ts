export class FingerprintError extends Error {
  constructor(cause: unknown) {
    super("Не удалось определить идентификатор браузера.", { cause });
    this.name = "FingerprintError";
  }
}

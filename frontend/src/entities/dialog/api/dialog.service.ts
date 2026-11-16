import { $axios } from "@shared/api";

import type { DialogDto } from "../types";

class _DialogService {
  private baseUrl = "/generation/chat/list";
  private client = $axios;

  getAll(fingerprint: string, signal: AbortSignal) {
    return this.client.get<DialogDto[]>(this.baseUrl, { params: { fingerprint }, signal });
  }
}

export const DialogService = new _DialogService();

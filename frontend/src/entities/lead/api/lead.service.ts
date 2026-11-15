import { $axios } from "@shared/api";

import { adapterCreateLeadToDto } from "../lib";
import type { CreateLeadRequest, LeadResponseDto } from "../types";

class _LeadService {
  private baseUrl = "/leads";
  private client = $axios;

  create(request: CreateLeadRequest, signal: AbortSignal) {
    return this.client.post<LeadResponseDto>(this.baseUrl, adapterCreateLeadToDto(request), { signal });
  }
}

export const LeadService = new _LeadService();

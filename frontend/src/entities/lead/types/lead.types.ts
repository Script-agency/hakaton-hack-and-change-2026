export interface LeadContact {
  company: string;
  fullName: string;
  phone: string;
}

export interface CreateLeadRequest extends LeadContact {
  summary: string;
  conversationId: number;
  fingerprint: string;
}

export type LeadStatus = "new" | "in_progress" | "closed" | "cancelled";

export interface Lead extends LeadContact {
  id: number;
  summary: string;
  status: LeadStatus;
  createdAt: string;
}

export type LeadFieldErrors = Partial<Record<keyof LeadContact, string>>;

export interface CreateLeadVariables {
  request: CreateLeadRequest;
  controller: AbortController;
}

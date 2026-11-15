import type { LeadStatus } from "./lead.types";

export interface CreateLeadRequestDto {
  company: string;
  full_name: string;
  phone: string;
  summary: string;
  conversation_id: number;
  fingerprint: string;
}

export interface LeadDto extends Omit<CreateLeadRequestDto, "conversation_id" | "fingerprint"> {
  conversation_id: number | null;
  fingerprint: string | null;
  id: number;
  status: LeadStatus;
  manager_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadResponseDto {
  item: LeadDto;
}

export interface LeadErrorResponseDto {
  error?: {
    code?: number;
    message?: string;
    details?: {
      errors?: Partial<Record<"company" | "full_name" | "phone" | "summary" | "messages", string[]>>;
    };
  };
}

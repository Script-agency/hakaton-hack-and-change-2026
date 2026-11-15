import type {
  CreateLeadRequest,
  CreateLeadRequestDto,
  Lead,
  LeadDto,
  LeadErrorResponseDto,
  LeadFieldErrors,
} from "../types";

export const adapterCreateLeadToDto = (request: CreateLeadRequest): CreateLeadRequestDto => ({
  company: request.company.trim(),
  full_name: request.fullName.trim(),
  phone: request.phone.replace(/[^+\d]/g, ""),
  summary: request.summary,
  messages: request.messages.map((message) => ({ role: message.role, content: message.text })),
});

export const adapterLeadFromDto = (dto: LeadDto): Lead => ({
  id: dto.id,
  company: dto.company,
  fullName: dto.full_name,
  phone: dto.phone,
  summary: dto.summary,
  status: dto.status,
  createdAt: dto.created_at,
});

export const adapterLeadFieldErrorsFromDto = (dto: LeadErrorResponseDto | undefined): LeadFieldErrors => {
  const errors = dto?.error?.details?.errors;
  const phoneError = errors?.phone?.[0];

  return {
    company: errors?.company?.[0],
    fullName: errors?.full_name?.[0],
    phone: phoneError === "Phone already exists" ? "Заявка с этим телефоном уже существует." : phoneError,
  };
};

import type { LeadContact } from "@entities/lead/types";

export type LeadRequestValues = LeadContact;
export type LeadRequestErrors = Partial<Record<keyof LeadRequestValues, string>>;

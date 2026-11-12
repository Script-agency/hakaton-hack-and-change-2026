export interface LeadRequestValues {
  company: string;
  fullName: string;
  phone: string;
}

export type LeadRequestErrors = Partial<Record<keyof LeadRequestValues, string>>;

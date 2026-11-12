export interface DialogSummary {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  messageCount: number;
  status: DialogStatus;
}

export enum DialogStatus {
  Open = "open",
  LeadSent = "lead-sent",
}

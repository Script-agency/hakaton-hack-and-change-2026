export interface DialogSummary {
  id: number;
  title: string;
  createdAt: string;
  messageCount: number;
  isCompleted: boolean;
  summary: string | null;
}

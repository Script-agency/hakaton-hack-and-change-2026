export interface DialogDto {
  id: number;
  fingerprint: string;
  created_at: string;
  message_count: number;
  is_completed: boolean;
  summary: string | null;
}

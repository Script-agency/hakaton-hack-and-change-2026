import type { DialogDto, DialogSummary } from "../types";

export const adapterDialogFromDto = (dto: DialogDto): DialogSummary => ({
  id: dto.id,
  title: `Диалог №${dto.id}`,
  createdAt: dto.created_at,
  messageCount: dto.message_count,
});

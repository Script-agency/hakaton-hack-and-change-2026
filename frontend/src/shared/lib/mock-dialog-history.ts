// Temporary mock backend storage, shared by the chat and history services.
export interface MockDialogRecord {
  id: number;
  title: string;
  preview: string;
  updatedAt: string;
  messageCount: number;
}

const records = new Map<number, MockDialogRecord>();

export const mockDialogHistory = {
  save: (record: MockDialogRecord) => records.set(record.id, record),
  list: () => [...records.values()],
  reset: () => records.clear(),
};

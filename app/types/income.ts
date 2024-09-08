export interface Income {
  id: string;
  userId: string;
  source: string;
  amount: number;
  date: Date;
  recurrenceInterval: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null;
  recurrenceEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
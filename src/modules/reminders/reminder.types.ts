export type ReminderChannel = "MOCK" | "SMS" | "WHATSAPP" | "EMAIL";
export type ReminderStatus = "PENDING" | "SENT" | "FAILED";

export type OverdueCustomer = {
  customerId: number;
  customerName: string;
  mobile: string;
  email: string | null;
  currentBalance: number;
  overdueDays: number;
  oldestOutstandingInvoiceDate: string | null;
  lastReminderAt: string | null;
  lastReminderStatus: ReminderStatus | null;
};

export type ReminderHistoryItem = {
  id: number;
  amount: number;
  message: string;
  channel: ReminderChannel;
  status: ReminderStatus;
  createdAt: string;
  createdBy: string | null;
};

export type SendReminderRequest = {
  customerId: number;
  channel: ReminderChannel;
};

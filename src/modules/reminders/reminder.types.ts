export type ReminderChannel = "MOCK" | "SMS" | "WHATSAPP" | "EMAIL";
export type ReminderStatus = "PENDING" | "SENT" | "FAILED";

export type OverdueCustomer = {
  customerId: number;
  customerName: string;
  active: boolean;
  mobile: string;
  email: string | null;
  currentBalance: number;
  overdueDays: number;
  oldestOutstandingInvoiceDate: string | null;
  oldestOutstandingInvoiceNo: string | null;
  oldestOutstandingInvoiceTotal: number | null;
  lastReminderAt: string | null;
  lastReminderStatus: ReminderStatus | null;
};

export type OverdueSummary = {
  customerCount: number;
  totalDue: number;
  maxOverdueDays: number;
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
  templateId?: number;
};

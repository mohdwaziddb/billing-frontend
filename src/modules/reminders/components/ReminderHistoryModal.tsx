import { useEffect, useState } from "react";
import { getReminderHistory } from "../reminder.api";
import type { ReminderHistoryItem } from "../reminder.types";
import { Modal } from "../../../components/Modal";
import { Table } from "../../../components/Table";
import { StatusBadge } from "../../../components/StatusBadge";
import { formatCurrency } from "../../../lib/currency";
import { formatDateTime } from "../../../lib/format";

export const ReminderHistoryModal = ({
  customerId,
  customerName,
  open,
  onClose
}: {
  customerId: number | null;
  customerName: string;
  open: boolean;
  onClose: () => void;
}) => {
  const [history, setHistory] = useState<ReminderHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !customerId) {
      return;
    }
    setLoading(true);
    void getReminderHistory(customerId)
      .then(setHistory)
      .finally(() => setLoading(false));
  }, [open, customerId]);

  return (
    <Modal open={open} title={`Reminder History • ${customerName}`} onClose={onClose}>
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300/75">
          Loading reminder history...
        </div>
      ) : (
        <Table
          data={history}
          emptyText="No reminders sent yet."
          columns={[
            { key: "channel", header: "Channel", render: (item) => item.channel },
            { key: "status", header: "Status", render: (item) => <StatusBadge label={item.status} /> },
            { key: "amount", header: "Amount", render: (item) => formatCurrency(item.amount) },
            { key: "sentAt", header: "Created At", render: (item) => formatDateTime(item.createdAt) },
            { key: "message", header: "Message", render: (item) => <span className="max-w-md text-sm text-slate-300/80">{item.message}</span> }
          ]}
        />
      )}
    </Modal>
  );
};

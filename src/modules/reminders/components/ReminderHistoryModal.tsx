import { useEffect, useState } from "react";
import { Modal } from "../../../components/Modal";
import { DEFAULT_PAGE_SIZE, Pagination } from "../../../components/Pagination";
import { StatusBadge } from "../../../components/StatusBadge";
import { Table } from "../../../components/Table";
import { formatCurrency } from "../../../lib/currency";
import { formatDateTime } from "../../../lib/format";
import type { PageResponse } from "../../../types/api";
import { getReminderHistory } from "../reminder.api";
import type { ReminderHistoryItem } from "../reminder.types";

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
  const [historyPage, setHistoryPage] = useState<PageResponse<ReminderHistoryItem>>({
    records: [],
    page: 0,
    size: DEFAULT_PAGE_SIZE,
    totalRecords: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(false);

  const loadHistory = (nextPage = 0) => {
    if (!customerId) {
      return;
    }
    setLoading(true);
    void getReminderHistory(customerId, { page: nextPage, size: DEFAULT_PAGE_SIZE })
      .then(setHistoryPage)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open || !customerId) {
      return;
    }
    loadHistory(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customerId]);

  return (
    <Modal open={open} title={`Reminder history - ${customerName}`} onClose={onClose}>
      {loading ? (
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 text-sm text-slate-300/75">
          Loading reminder history...
        </div>
      ) : (
        <Table
          data={historyPage.records}
          emptyText="No reminders sent yet."
          columns={[
            { key: "channel", header: "Channel", render: (item) => item.channel },
            { key: "status", header: "Status", render: (item) => <StatusBadge label={item.status} /> },
            {
              key: "amount",
              header: "Amount",
              className: "text-right",
              render: (item) => <span className="block text-right">{formatCurrency(item.amount)}</span>
            },
            { key: "sentAt", header: "Created At", render: (item) => formatDateTime(item.createdAt) },
            {
              key: "message",
              header: "Message",
              render: (item) => <span className="max-w-md text-sm text-slate-300/80">{item.message}</span>
            }
          ]}
        />
      )}
      <Pagination
        page={historyPage.page}
        size={historyPage.size}
        totalRecords={historyPage.totalRecords}
        totalPages={historyPage.totalPages}
        disabled={loading}
        onPageChange={loadHistory}
      />
    </Modal>
  );
};

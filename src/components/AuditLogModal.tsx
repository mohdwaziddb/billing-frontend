import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { getAuditLogs } from "../api/auditLogs";
import { exportToExcel } from "../lib/excelExport";
import { formatDateTime } from "../lib/format";
import type { AuditLog, PageResponse } from "../types/api";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { Pagination } from "./Pagination";
import { Table } from "./Table";

type AuditLogModalProps = {
  open: boolean;
  moduleName: string;
  entityId: number | null;
  title: string;
  onClose: () => void;
};

type AuditChangeRow = {
  id: string;
  date: string;
  user: string;
  action: string;
  field: string;
  oldValue: string;
  newValue: string;
};

const emptyPage: PageResponse<AuditLog> = {
  records: [],
  page: 0,
  size: 20,
  totalRecords: 0,
  totalPages: 0
};

export const AuditLogModal = ({ open, moduleName, entityId, title, onClose }: AuditLogModalProps) => {
  const [page, setPage] = useState(0);
  const [logs, setLogs] = useState<PageResponse<AuditLog>>(emptyPage);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !entityId) {
      return;
    }
    setLoading(true);
    void getAuditLogs({ moduleName, entityId, page, size: 20 })
      .then(setLogs)
      .finally(() => setLoading(false));
  }, [entityId, moduleName, open, page]);

  useEffect(() => {
    if (open) {
      setPage(0);
    }
  }, [entityId, open]);

  const rows = useMemo(() => logs.records.flatMap(toRows), [logs.records]);

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="flex min-h-[560px] flex-col gap-4">
        <div className="flex justify-end">
          <Button type="button" variant="secondary" disabled={!rows.length || loading} onClick={() => exportToExcel(`${moduleName.toLowerCase().replace(/\s+/g, "-")}-logs.xlsx`, rows, [
            { key: "date", header: "Date" },
            { key: "user", header: "User" },
            { key: "action", header: "Action" },
            { key: "field", header: "Field" },
            { key: "oldValue", header: "Old Value" },
            { key: "newValue", header: "New Value" }
          ])}>
            <Download size={16} />
            Export Logs
          </Button>
        </div>
        <div className="flex-1">
          <Table
            data={loading ? [] : rows}
            emptyText={loading ? "Loading logs..." : "No change history found."}
            columns={[
              { key: "date", header: "Date", render: (item) => item.date },
              { key: "user", header: "User", render: (item) => item.user },
              { key: "action", header: "Action", render: (item) => item.action },
              { key: "field", header: "Field Changed", render: (item) => item.field },
              { key: "old", header: "Old Value", render: (item) => item.oldValue },
              { key: "new", header: "New Value", render: (item) => item.newValue }
            ]}
          />
        </div>
        <div className="mt-auto">
          <Pagination page={logs.page} size={logs.size} totalRecords={logs.totalRecords} totalPages={logs.totalPages} disabled={loading} onPageChange={setPage} />
        </div>
      </div>
    </Modal>
  );
};

const toRows = (log: AuditLog): AuditChangeRow[] => {
  const changed = parseJson(log.changedFields);
  const entries = changed && typeof changed === "object" ? Object.entries(changed as Record<string, { old?: unknown; new?: unknown }>) : [];
  if (!entries.length) {
    return [{
      id: String(log.id),
      date: formatDateTime(log.createdAt),
      user: log.userName ?? "--",
      action: log.actionType,
      field: "--",
      oldValue: stringify(parseJson(log.oldData)),
      newValue: stringify(parseJson(log.newData))
    }];
  }
  return entries.map(([field, value]) => ({
    id: `${log.id}-${field}`,
    date: formatDateTime(log.createdAt),
    user: log.userName ?? "--",
    action: log.actionType,
    field,
    oldValue: stringify(value?.old),
    newValue: stringify(value?.new)
  }));
};

const parseJson = (value: string | null) => {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const stringify = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return "--";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
};

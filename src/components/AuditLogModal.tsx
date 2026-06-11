import { useEffect, useMemo, useState } from "react";
import { History, X } from "lucide-react";
import { getAuditLogs } from "../api/auditLogs";
import { FieldDisplayNameMapper } from "../lib/FieldDisplayNameMapper";
import { formatDateTime } from "../lib/format";
import type { AuditLog } from "../types/api";
import { Button } from "./Button";
import { Pagination } from "./Pagination";
import { PreviewSurface } from "./PreviewSurface";
import { StatusBadge } from "./StatusBadge";
import { Table } from "./Table";

type ChangeRow = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

export const AuditLogModal = ({
  open,
  moduleName,
  entityId,
  title,
  onClose
}: {
  open: boolean;
  moduleName: string;
  entityId: number | null;
  title: string;
  onClose: () => void;
}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const size = 20;

  useEffect(() => {
    if (!open || !entityId) {
      return;
    }
    let cancelled = false;
    getAuditLogs({ moduleName, entityId, page, size })
      .then((response) => {
        if (cancelled) {
          return;
        }
        setLogs(response.records);
        setSelected((current) => current ?? response.records[0] ?? null);
        setTotalPages(response.totalPages);
        setTotalRecords(response.totalRecords);
      })
      .catch(() => {
        if (!cancelled) {
          setLogs([]);
          setSelected(null);
          setTotalPages(0);
          setTotalRecords(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, moduleName, entityId, page]);

  useEffect(() => {
    if (open) {
      setPage(0);
      setSelected(null);
    }
  }, [open, moduleName, entityId]);

  const changes = useMemo(() => getChanges(selected), [selected]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm">
      <button type="button" aria-label="Close logs drawer" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-5xl flex-col overflow-hidden bg-white shadow-[0_30px_90px_rgba(2,6,23,0.35)] dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              <History size={15} /> Change History
            </p>
            <h3 className="mt-2 text-xl font-extrabold text-slate-950 dark:text-white">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{moduleName} #{entityId ?? "--"}</p>
          </div>
          <button type="button" aria-label="Close logs drawer" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="min-w-0">
            <Table
              data={logs}
              emptyText='No logs found for this record.'
              columns={[
                { key: "date", header: "Date", render: (log) => <span className="whitespace-nowrap text-slate-700">{formatDateTime(log.createdAt)}</span> },
                { key: "action", header: "Action", render: (log) => <StatusBadge label={log.actionType} /> },
                { key: "user", header: "Changed By", render: (log) => <span className="font-semibold text-slate-950">{log.userName ?? "--"}</span> },
                { key: "changes", header: "Changes", render: (log) => <Button type="button" variant={selected?.id === log.id ? "primary" : "secondary"} onClick={() => setSelected(log)}>View Changes</Button> }
              ]}
            />
            <div className="mt-4">
              <Pagination page={page} size={size} totalRecords={totalRecords} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>

          <PreviewSurface className="min-h-[360px]">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-70">Selected Change</p>
              <h4 className="mt-2 text-lg font-extrabold">{selected ? `${selected.actionType} by ${selected.userName ?? "Unknown"}` : "No change selected"}</h4>
              <p className="mt-1 text-sm opacity-75">{formatDateTime(selected?.createdAt)}</p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-black/5 dark:bg-white/10">
                  <tr>
                    <th className="px-3 py-3 font-bold">Field Name</th>
                    <th className="px-3 py-3 font-bold">Old Value</th>
                    <th className="px-3 py-3 font-bold">New Value</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.length ? changes.map((change) => (
                    <tr key={change.field} className="border-t border-black/10 dark:border-white/10">
                      <td className="px-3 py-3 font-semibold">{FieldDisplayNameMapper.toDisplayName(change.field)}</td>
                      <td className="px-3 py-3 opacity-80">{formatValue(change.oldValue)}</td>
                      <td className="px-3 py-3 opacity-95">{formatValue(change.newValue)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td className="px-3 py-8 text-center opacity-70" colSpan={3}>No field level changes available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </PreviewSurface>
        </div>
      </aside>
    </div>
  );
};

const getChanges = (log: AuditLog | null): ChangeRow[] => {
  if (!log) {
    return [];
  }
  const changed = parseJson(log.changedFields);
  if (changed && Object.keys(changed).length) {
    return Object.entries(changed).map(([field, value]) => {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const record = value as Record<string, unknown>;
        return { field, oldValue: record.old, newValue: record.new };
      }
      return { field, oldValue: "", newValue: value };
    });
  }
  const oldData = parseJson(log.oldData) ?? {};
  const newData = parseJson(log.newData) ?? {};
  const fields = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  return [...fields].map((field) => ({ field, oldValue: oldData[field], newValue: newData[field] }));
};

const parseJson = (value: string | null): Record<string, unknown> | null => {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === "") {
    return "--";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
};

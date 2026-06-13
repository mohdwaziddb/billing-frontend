import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, History, PencilLine, Trash2, X } from "lucide-react";
import { getAuditLogs } from "../api/auditLogs";
import { FieldDisplayNameMapper } from "../lib/FieldDisplayNameMapper";
import { formatDateTime } from "../lib/format";
import { DEFAULT_THEME_COLOR, getContrastTextColor } from "../lib/theme";
import type { AuditLog } from "../types/api";
import { Pagination } from "./Pagination";

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

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const changes = useMemo(() => getChanges(selected), [selected]);
  const themePalette = useMemo(() => readThemePalette(), [open]);

  if (!open) {
    return null;
  }

  const selectedMeta = actionMeta(selected?.actionType);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm">
      <button type="button" aria-label="Close logs modal" className="fixed inset-0 h-full w-full cursor-default" onClick={onClose} />
      <aside className="absolute right-3 top-1/2 flex h-[75vh] max-h-[75vh] w-[calc(100vw-1.5rem)] -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-[0_30px_90px_rgba(2,6,23,0.38)] dark:bg-slate-950 md:right-5 md:w-[80vw] lg:w-[76vw] lg:max-w-5xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              <History size={15} /> Change History
            </p>
            <h3 className="mt-1.5 text-lg font-extrabold text-slate-950 dark:text-slate-50">{title}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{moduleName} #{entityId ?? "--"}</p>
          </div>
          <button type="button" aria-label="Close logs modal" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="min-h-0 overflow-y-auto border-b border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900 lg:border-b-0 lg:border-r">
            {logs.length ? (
              <div className="space-y-1.5">
                {logs.map((log, index) => {
                  const meta = actionMeta(log.actionType);
                  const active = selected?.id === log.id;
                  const Icon = meta.icon;
                  const activeStyle = active ? {
                    backgroundColor: themePalette.activeBackground,
                    borderColor: themePalette.themeColor,
                    color: themePalette.activeText
                  } : undefined;
                  return (
                    <button
                      key={log.id}
                      type="button"
                      className={[
                        "relative flex w-full gap-2.5 rounded-lg border p-2 text-left transition",
                        active
                          ? "shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                      ].join(" ")}
                      style={activeStyle}
                      onClick={() => setSelected(log)}
                    >
                      <span className="relative flex flex-col items-center">
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${meta.badgeClass}`}>
                          <Icon size={14} />
                        </span>
                        {index < logs.length - 1 ? <span className="mt-1 h-full min-h-5 w-px bg-slate-200 dark:bg-slate-700" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${meta.pillClass}`}>
                          {cleanAction(log.actionType)}
                        </span>
                        <span className="mt-1 block truncate text-xs font-bold text-slate-950 dark:text-slate-50" style={active ? { color: themePalette.activeText } : undefined}>{log.userName ?? "Unknown User"}</span>
                        <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400" style={active ? { color: themePalette.activeText, opacity: 0.78 } : undefined}>{formatDateTime(log.createdAt)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No logs found for this record.
              </div>
            )}
            <div className="mt-5">
              <Pagination page={page} size={size} totalRecords={totalRecords} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto p-3">
            <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Selected Change</p>
                  <h4 className="mt-1 text-base font-extrabold text-slate-950 dark:text-slate-50">
                    {selected ? `${cleanAction(selected.actionType)} by ${selected.userName ?? "Unknown"}` : "No change selected"}
                  </h4>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatDateTime(selected?.createdAt)}</p>
                </div>
                {selected ? <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold uppercase ${selectedMeta.pillClass}`}>{cleanAction(selected.actionType)}</span> : null}
              </div>
            </div>

            <div className="mt-2.5 space-y-1.5">
              {changes.length ? changes.map((change) => (
                <ChangeLine key={change.field} change={change} />
              )) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No meaningful field changes available.</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Empty values and unchanged fields are hidden automatically.</p>
                </div>
              )}
            </div>
          </div>
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
    }).filter(isMeaningfulChange);
  }
  const oldData = parseJson(log.oldData) ?? {};
  const newData = parseJson(log.newData) ?? {};
  const fields = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  return [...fields]
    .map((field) => ({ field, oldValue: oldData[field], newValue: newData[field] }))
    .filter(isMeaningfulChange);
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

const hasDisplayValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string" && (value.trim() === "" || value.trim() === "--")) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }
  return true;
};

const isMeaningfulChange = (change: ChangeRow) => {
  if (!hasDisplayValue(change.newValue)) {
    return false;
  }
  if (!hasDisplayValue(change.oldValue) && !hasDisplayValue(change.newValue)) {
    return false;
  }
  return formatValue(change.oldValue) !== formatValue(change.newValue);
};

const cleanAction = (actionType?: string | null) => (actionType ?? "CHANGE").replace(/_/g, " ");

const actionMeta = (actionType?: string | null) => {
  const action = (actionType ?? "").toUpperCase();
  if (action.includes("DELETE")) {
    return {
      icon: Trash2,
      badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200",
      pillClass: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200"
    };
  }
  if (action.includes("CREATE") || action.includes("ADDED")) {
    return {
      icon: CheckCircle2,
      badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
      pillClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
    };
  }
  return {
    icon: PencilLine,
    badgeClass: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200",
    pillClass: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200"
  };
};

const ChangeLine = ({ change }: { change: ChangeRow }) => (
  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="grid gap-1.5 text-sm lg:grid-cols-[160px_minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <p className="min-w-0 break-words text-xs font-extrabold uppercase text-slate-600 dark:text-slate-300">{FieldDisplayNameMapper.toDisplayName(change.field)}</p>
      <p className="min-w-0 break-words text-slate-600 dark:text-slate-300">
        <span className="font-bold text-slate-500 dark:text-slate-400">Old:</span> {formatValue(change.oldValue)}
      </p>
      <p className="min-w-0 break-words font-semibold text-slate-950 dark:text-slate-50">
        <span className="font-bold text-slate-500 dark:text-slate-400">New:</span> {formatValue(change.newValue)}
      </p>
    </div>
  </div>
);

const readThemePalette = () => {
  if (typeof document === "undefined") {
    return {
      themeColor: DEFAULT_THEME_COLOR,
      activeBackground: DEFAULT_THEME_COLOR,
      activeText: getContrastTextColor(DEFAULT_THEME_COLOR)
    };
  }
  const styles = getComputedStyle(document.documentElement);
  const themeColor = styles.getPropertyValue("--theme-color").trim() || DEFAULT_THEME_COLOR;
  const activeBackground = styles.getPropertyValue("--theme-light").trim() || themeColor;
  return {
    themeColor,
    activeBackground,
    activeText: getContrastTextColor(activeBackground)
  };
};

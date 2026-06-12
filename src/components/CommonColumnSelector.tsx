import { useEffect, useMemo, useState } from "react";
import { Columns3, Settings2 } from "lucide-react";
import { getColumnPreference, saveColumnPreference } from "../api/columnPreferences";
import { notificationService } from "../services/notificationService";

export type ColumnSelectorOption = {
  key: string;
  header: string;
  locked?: boolean;
};

export const CommonColumnSelector = ({
  tableName,
  availableColumns,
  visibleColumns,
  onApply
}: {
  tableName: string;
  availableColumns: ColumnSelectorOption[];
  visibleColumns: string[];
  onApply: (columns: string[]) => void;
}) => {
  const defaultColumns = useMemo(() => availableColumns.map((column) => column.key), [availableColumns]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(visibleColumns.length ? visibleColumns : defaultColumns);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getColumnPreference(tableName)
      .then((preference) => {
        if (cancelled) {
          return;
        }
        const valid = preference.visibleColumns.filter((key) => availableColumns.some((column) => column.key === key));
        if (valid.length) {
          setDraft(valid);
          onApply(valid);
        } else {
          setDraft(defaultColumns);
          onApply(defaultColumns);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDraft(defaultColumns);
          onApply(defaultColumns);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tableName, defaultColumns.join("|"), availableColumns.length]);

  useEffect(() => {
    setDraft(visibleColumns.length ? visibleColumns : defaultColumns);
  }, [visibleColumns, defaultColumns]);

  const toggle = (key: string) => {
    const column = availableColumns.find((item) => item.key === key);
    if (column?.locked) {
      return;
    }
    setDraft((current) => {
      if (current.includes(key)) {
        return current.filter((item) => item !== key);
      }
      return [...current, key];
    });
  };

  const apply = async () => {
    const next = availableColumns.filter((column) => draft.includes(column.key)).map((column) => column.key);
    if (!next.length) {
      notificationService.showWarning("At least one column must be visible.");
      return;
    }
    try {
      setSaving(true);
      const saved = await saveColumnPreference(tableName, next);
      const valid = saved.visibleColumns.filter((key) => availableColumns.some((column) => column.key === key));
      const finalColumns = valid.length ? valid : next;
      onApply(finalColumns);
      setDraft(finalColumns);
      setOpen(false);
      notificationService.showSuccess("Column preference saved.");
    } catch (error) {
      notificationService.showError("Unable to save column preference", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[var(--theme-color)] hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        onClick={() => setOpen((current) => !current)}
      >
        <Columns3 size={16} />
        Columns
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
            <Settings2 size={15} className="text-[var(--theme-color)]" />
            <p className="text-sm font-bold text-slate-950 dark:text-white">Select columns</p>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {availableColumns.map((column) => (
              <label key={column.key} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-[var(--theme-color)]"
                  checked={draft.includes(column.key)}
                  disabled={column.locked}
                  onChange={() => toggle(column.key)}
                />
                <span className="min-w-0 flex-1 truncate">{column.header}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 px-3 py-2.5 dark:border-slate-800">
            <button type="button" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => { setDraft(visibleColumns.length ? visibleColumns : defaultColumns); setOpen(false); }}>
              Cancel
            </button>
            <button type="button" className="rounded-lg bg-[var(--theme-color)] px-3 py-2 text-sm font-semibold text-[var(--theme-contrast)] disabled:opacity-60" disabled={saving} onClick={() => void apply()}>
              Apply
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const applyVisibleColumns = <T extends { key: string }>(columns: T[], visibleColumns: string[]) => {
  if (!visibleColumns.length) {
    return columns;
  }
  return columns.filter((column) => visibleColumns.includes(column.key));
};

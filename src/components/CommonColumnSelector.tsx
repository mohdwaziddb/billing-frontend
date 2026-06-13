import { useEffect, useMemo, useRef, useState } from "react";
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
  const selectorRef = useRef<HTMLDivElement | null>(null);
  const saveSequence = useRef(0);

  const normalizeColumns = (keys: string[]) => {
    const validKeys = availableColumns
      .filter((column) => keys.includes(column.key))
      .map((column) => column.key);

    if (validKeys.length) {
      return validKeys;
    }

    const firstUnlocked = availableColumns.find((column) => !column.locked)?.key;
    const firstLocked = availableColumns.find((column) => column.locked)?.key;
    return firstUnlocked ? [firstUnlocked] : firstLocked ? [firstLocked] : defaultColumns.slice(0, 1);
  };

  const persistColumns = async (next: string[], fallback: string[]) => {
    const requestId = ++saveSequence.current;
    try {
      const saved = await saveColumnPreference(tableName, next);
      if (requestId !== saveSequence.current) {
        return;
      }
      const finalColumns = normalizeColumns(saved.visibleColumns);
      setDraft(finalColumns);
      onApply(finalColumns);
    } catch (error) {
      if (requestId === saveSequence.current) {
        setDraft(fallback);
        onApply(fallback);
      }
      notificationService.showError("Unable to save column preference", error);
    }
  };

  useEffect(() => {
    let cancelled = false;
    getColumnPreference(tableName)
      .then((preference) => {
        if (cancelled) {
          return;
        }
        const valid = normalizeColumns(preference.visibleColumns);
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

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (!selectorRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const updateColumns = (next: string[]) => {
    const previous = visibleColumns.length ? normalizeColumns(visibleColumns) : normalizeColumns(defaultColumns);
    const normalized = normalizeColumns(next);
    setDraft(normalized);
    onApply(normalized);
    void persistColumns(normalized, previous);
  };

  const toggle = (key: string) => {
    const column = availableColumns.find((item) => item.key === key);
    if (column?.locked) {
      return;
    }
    const next = draft.includes(key)
      ? draft.filter((item) => item !== key)
      : [...draft, key];
    if (!next.length) {
      notificationService.showWarning("At least one column must be visible.");
      return;
    }
    updateColumns(next);
  };

  const selectAll = () => updateColumns(defaultColumns);

  const resetDefault = () => updateColumns(defaultColumns);

  return (
    <div ref={selectorRef} className="relative">
      <button
        type="button"
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[var(--theme-color)] hover:bg-slate-50 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        onClick={() => setOpen((current) => !current)}
      >
        <Columns3 size={16} />
        Select Column
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
            <Settings2 size={15} className="text-[var(--theme-color)]" />
            <p className="text-sm font-bold text-slate-950 dark:text-white">Select Column</p>
          </div>
          <div className="flex gap-2 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={selectAll}
            >
              Select All
            </button>
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={resetDefault}
            >
              Reset Default
            </button>
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

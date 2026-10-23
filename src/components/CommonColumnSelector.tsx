import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Lock, SlidersHorizontal } from "lucide-react";
import { getColumnPreference, saveColumnPreference } from "../api/columnPreferences";
import { useAnchoredPanel } from "../hooks/useAnchoredPanel";
import { platformAdminColumnPrefsStorage } from "../lib/storage";
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
  onApply,
  localOnly = false
}: {
  tableName: string;
  availableColumns: ColumnSelectorOption[];
  visibleColumns: string[];
  onApply: (columns: string[]) => void;
  localOnly?: boolean;
}) => {
  // Parent har render par naya availableColumns array deta hai (CommonListPage .map). Memo ko
  // keys ke string par tikao — warna defaultColumns har render naya, neeche ka setDraft effect
  // har render chalta aur preference load hone tak "Maximum update depth exceeded" loop.
  const columnsSignature = availableColumns.map((column) => `${column.key}:${column.locked ? 1 : 0}`).join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const defaultColumns = useMemo(() => availableColumns.map((column) => column.key), [columnsSignature]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lockedColumns = useMemo(() => availableColumns.filter((column) => column.locked).map((column) => column.key), [columnsSignature]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selectableColumns = useMemo(() => availableColumns.filter((column) => !column.locked).map((column) => column.key), [columnsSignature]);
  const [draft, setDraft] = useState<string[]>(visibleColumns.length ? visibleColumns : defaultColumns);
  const saveSequence = useRef(0);
  const { open, toggle: togglePanel, buttonRef, panelRef, panelStyle } = useAnchoredPanel({
    panelWidth: 288,
    panelHeight: (panel) => panel?.offsetHeight ?? 380
  });

  const normalizeColumns = (keys: string[]) => {
    const validKeys = availableColumns
      .filter((column) => keys.includes(column.key))
      .map((column) => column.key);

    const merged = new Set(validKeys);
    lockedColumns.forEach((key) => merged.add(key));

    if (merged.size) {
      return availableColumns
        .filter((column) => merged.has(column.key))
        .map((column) => column.key);
    }

    const firstUnlocked = availableColumns.find((column) => !column.locked)?.key;
    const firstLocked = availableColumns.find((column) => column.locked)?.key;
    return firstUnlocked ? [firstUnlocked] : firstLocked ? [firstLocked] : defaultColumns.slice(0, 1);
  };

  const persistColumns = async (next: string[], fallback: string[]) => {
    if (localOnly) {
      platformAdminColumnPrefsStorage.set(tableName, next);
      setDraft(next);
      onApply(next);
      return;
    }
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
    if (localOnly) {
      const stored = platformAdminColumnPrefsStorage.get(tableName);
      const initial = normalizeColumns(stored ?? defaultColumns);
      setDraft(initial);
      onApply(initial);
      return () => {
        cancelled = true;
      };
    }
    getColumnPreference(tableName)
      .then((preference) => {
        if (cancelled) {
          return;
        }
        // Saved preference me ek bhi (non-locked) column na ho = kabhi save hi nahi hua
        // (naya user). Pehle yahan sirf locked column bachta tha aur naye user ko table me
        // akela "Payment Ref" dikhta tha — ab saare default columns.
        const savedKeys = (preference.visibleColumns ?? []).filter((key) => selectableColumns.includes(key));
        const valid = savedKeys.length ? normalizeColumns(preference.visibleColumns) : defaultColumns;
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
  const unselectAll = () => updateColumns(lockedColumns);

  const resetDefault = () => updateColumns(defaultColumns);
  const allSelectableSelected = selectableColumns.length > 0 && selectableColumns.every((key) => draft.includes(key));

  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          className="fixed z-[1100] w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
          style={{ top: panelStyle.top, left: panelStyle.left }}
        >
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <SlidersHorizontal size={15} className="text-[var(--theme-color)]" />
            <p className="text-sm font-bold text-slate-950">Select Column</p>
          </div>
          <div className="flex gap-2 border-b border-slate-100 px-3 py-2.5">
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              onClick={allSelectableSelected ? unselectAll : selectAll}
            >
              {allSelectableSelected ? "Unselect All" : "Select All"}
            </button>
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              onClick={resetDefault}
            >
              Reset Default
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {availableColumns.map((column) => (
              <label
                key={column.key}
                title={column.locked ? "Always visible — cannot be unselected" : undefined}
                className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-700 ${column.locked ? "cursor-default" : "cursor-pointer hover:bg-slate-50"}`}
              >
                {column.locked ? (
                  <Lock size={14} className="shrink-0 text-slate-400" />
                ) : (
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-[var(--theme-color)]"
                    checked={draft.includes(column.key)}
                    onChange={() => toggle(column.key)}
                  />
                )}
                <span className="min-w-0 flex-1 truncate">{column.header}</span>
              </label>
            ))}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] border border-slate-200 bg-white text-slate-700 transition hover:border-[var(--theme-color)] hover:bg-slate-50 hover:text-slate-950"
        aria-label="Select Column"
        title="Select Column"
        onClick={togglePanel}
      >
        <SlidersHorizontal size={16} />
      </button>
      {panel}
    </div>
  );
};

export const applyVisibleColumns = <T extends { key: string }>(columns: T[], visibleColumns: string[]) => {
  if (!visibleColumns.length) {
    return columns;
  }
  return columns.filter((column) => visibleColumns.includes(column.key));
};

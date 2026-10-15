import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Columns3, Settings2 } from "lucide-react";
import { getColumnPreference, saveColumnPreference } from "../api/columnPreferences";
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
  const defaultColumns = useMemo(() => availableColumns.map((column) => column.key), [availableColumns]);
  const lockedColumns = useMemo(() => availableColumns.filter((column) => column.locked).map((column) => column.key), [availableColumns]);
  const selectableColumns = useMemo(() => availableColumns.filter((column) => !column.locked).map((column) => column.key), [availableColumns]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(visibleColumns.length ? visibleColumns : defaultColumns);
  const selectorRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
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

    // Portal me render hota hai taaki card/table ke overflow me kate nahi.
    // Neeche jagah na ho to button ke upar khulta hai.
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const width = 288;
      const height = 380;
      const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow >= height + 8 || rect.top < height + 8
        ? Math.min(rect.bottom + 8, window.innerHeight - 120)
        : Math.max(8, rect.top - height - 8);
      setPanelStyle({ top, left });
    };
    place();

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    const handleScroll = (event: Event) => {
      // Panel ke andar ka scroll (lambi column list) ignore — warna panel
      // kholte hi uska apna scrollbar use karte band ho jata hai.
      // Sirf bahar (page/table) ke scroll par band karo.
      if (panelRef.current?.contains(event.target as Node)) {
        return;
      }
      setOpen(false);
    };
    const dismiss = () => setOpen(false);

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", dismiss);
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
            <Settings2 size={15} className="text-[var(--theme-color)]" />
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
              <label key={column.key} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
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
        </div>,
        document.body
      )
    : null;

  return (
    <div ref={selectorRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[var(--radius-control)] border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-700 transition hover:border-[var(--theme-color)] hover:bg-slate-50 hover:text-slate-950"
        onClick={() => setOpen((current) => !current)}
      >
        <Columns3 size={15} />
        Select Column
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

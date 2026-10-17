import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ListFilter, Search, X } from "lucide-react";
import { Button } from "./Button";

/**
 * List pages ka common toolbar — myMschool standard:
 * left: [Filter] [Search........]   right: [actions] [pagination]
 * Filter button ek centered popup kholta hai (grey backdrop + fields + Cancel/Apply).
 */
export const ListToolbar = ({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onSearchClear,
  searchPlaceholder = "Search",
  showSearch = true,
  filtersActiveCount = 0,
  filterPanelWidth = "max-w-[560px]",
  filtersClassName = "space-y-3",
  onApplyFilters,
  onCancelFilters,
  onResetFilters,
  actions,
  pagination,
  children
}: {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  onSearchClear?: () => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  filtersActiveCount?: number;
  filterPanelWidth?: string;
  filtersClassName?: string;
  onApplyFilters?: () => void;
  onCancelFilters?: () => void;
  onResetFilters?: () => void;
  actions?: ReactNode;
  pagination?: ReactNode;
  children?: ReactNode;
}) => {
  const hasFilters = Boolean(children);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancelFilters?.();
        setOpen(false);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const closeWithCancel = () => {
    onCancelFilters?.();
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {hasFilters ? (
          <button
            type="button"
            className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-[var(--radius-control)] border px-3.5 text-[13px] font-semibold transition ${
              open || filtersActiveCount
                ? "border-[var(--theme-color)] bg-[color-mix(in_srgb,var(--theme-color)_8%,white)] text-[var(--theme-color)]"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
          >
            <ListFilter size={16} />
            Filter
            {filtersActiveCount ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--theme-color)] px-1.5 text-[11px] font-bold text-[var(--theme-contrast)]">
                {filtersActiveCount}
              </span>
            ) : null}
          </button>
        ) : null}
        {showSearch ? (
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-[var(--radius-control)] border border-slate-200 bg-white pl-10 pr-9 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--theme-color)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_18%,transparent)]"
              placeholder={searchPlaceholder}
              value={searchValue ?? ""}
              onChange={(event) => onSearchChange?.(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSearchSubmit?.();
                }
              }}
            />
            {searchValue ? (
              <button
                type="button"
                className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Clear search"
                onClick={() => {
                  onSearchChange?.("");
                  onSearchClear?.();
                }}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        {actions}
        {pagination}
      </div>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/40 p-4"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  closeWithCancel();
                }
              }}
            >
              <div className={`w-full ${filterPanelWidth} rounded-lg border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.28)]`}>
                <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
                  <ListFilter size={16} className="text-[var(--theme-color)]" />
                  <p className="text-sm font-bold text-slate-950">Filter</p>
                </div>
                <div className={`${filtersClassName} px-5 py-4`}>{children}</div>
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3.5">
                  {onResetFilters ? (
                    <Button type="button" variant="ghost" className="min-h-9 px-4 py-2" onClick={onResetFilters}>
                      Reset
                    </Button>
                  ) : <span />}
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" className="min-h-9 px-4 py-2" onClick={closeWithCancel}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      className="min-h-9 px-4 py-2"
                      onClick={() => {
                        onApplyFilters?.();
                        setOpen(false);
                      }}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
};

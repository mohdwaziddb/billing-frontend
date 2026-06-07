import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";
import { GlassCard } from "./GlassCard";

type CommonAdvancedFilterPanelProps = {
  title: string;
  eyebrow?: string;
  expanded: boolean;
  activeFilters?: string[];
  onToggle: () => void;
  onClearAll?: () => void;
  children: ReactNode;
};

export const CommonAdvancedFilterPanel = ({
  title,
  eyebrow = "Advanced Filters",
  expanded,
  activeFilters = [],
  onToggle,
  onClearAll,
  children
}: CommonAdvancedFilterPanelProps) => {
  const filterCount = activeFilters.length;

  return (
    <GlassCard className="p-4 md:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <button type="button" className="group flex min-w-0 flex-1 items-center gap-3 text-left" onClick={onToggle}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--theme-color)_10%,white)] text-[var(--theme-color)]">
            <SlidersHorizontal size={18} />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{eyebrow}</span>
            <span className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-lg font-bold text-slate-950">
              {title}
              {filterCount ? (
                <span className="rounded-full bg-[var(--theme-color)] px-2.5 py-1 text-xs font-bold text-[var(--theme-contrast)]">
                  {filterCount}
                </span>
              ) : null}
            </span>
          </span>
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {filterCount && onClearAll ? (
            <Button type="button" variant="ghost" className="min-h-9 px-3 py-2" onClick={onClearAll}>
              <X size={15} />
              Clear All
            </Button>
          ) : null}
          <Button type="button" variant="secondary" className="min-h-9 px-3 py-2" onClick={onToggle}>
            {expanded ? "Collapse Filters" : "Expand Filters"}
            <ChevronDown size={16} className={`transition ${expanded ? "rotate-180" : ""}`} />
          </Button>
        </div>
      </div>

      {filterCount ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <span className="font-semibold text-slate-950">Filters Applied:</span>
          {activeFilters.map((filter) => (
            <span key={filter} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
              {filter}
            </span>
          ))}
        </div>
      ) : null}

      {expanded ? <div className="mt-4 border-t border-slate-200 pt-4">{children}</div> : null}
    </GlassCard>
  );
};

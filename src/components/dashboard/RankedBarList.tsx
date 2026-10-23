import { formatCurrency } from "../../lib/currency";

export type RankedBarItem = {
  id: string | number;
  label: string;
  value: number;
  /** Chhota secondary text, e.g. "12 sold". */
  meta?: string;
};

/**
 * Ranking ke liye horizontal bars (donut se zyada padhne layak: lambai seedha compare hoti hai).
 * Ek hi series = ek rang; value bar ke end par text token me, rang me nahi.
 */
export const RankedBarList = ({ items, color, emptyText }: { items: RankedBarItem[]; color: string; emptyText: string }) => {
  const max = Math.max(0, ...items.map((item) => item.value));
  if (!items.length || max <= 0) {
    return <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">{emptyText}</div>;
  }
  return (
    <ol className="space-y-3.5">
      {items.map((item, index) => (
        <li key={item.id} title={`${item.label}: ${formatCurrency(item.value)}`}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="flex min-w-0 items-baseline gap-2">
              <span className="w-4 shrink-0 fs-11 font-bold text-slate-400 tabular-nums">{index + 1}</span>
              <span className="truncate fs-13 font-semibold text-slate-800">{item.label}</span>
              {item.meta ? <span className="shrink-0 fs-11 text-slate-400">{item.meta}</span> : null}
            </p>
            <span className="shrink-0 fs-13 font-bold text-slate-950 tabular-nums">{formatCurrency(item.value)}</span>
          </div>
          <div className="mt-1.5 ml-6 h-2 rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%`, background: color }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
};

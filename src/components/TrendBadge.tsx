import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import type { TrendStatus } from "../types/api";

export const TrendBadge = ({
  status,
  percentage
}: {
  status: TrendStatus;
  percentage: number;
}) => {
  const shared = "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold";

  if (status === "UP") {
    return (
      <span className={`${shared} border-emerald-300/30 bg-emerald-300/10 text-emerald-200`}>
        <ArrowUpRight size={14} />
        +{percentage.toFixed(2)}%
      </span>
    );
  }

  if (status === "DOWN") {
    return (
      <span className={`${shared} border-rose-300/30 bg-rose-300/10 text-rose-200`}>
        <ArrowDownRight size={14} />
        {percentage.toFixed(2)}%
      </span>
    );
  }

  return (
    <span className={`${shared} border-slate-300/20 bg-slate-300/10 text-slate-200`}>
      <ArrowRight size={14} />
      0.00%
    </span>
  );
};

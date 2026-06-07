import type { CSSProperties, ReactNode } from "react";
import { GlassCard } from "./GlassCard";

export const StatCard = ({
  label,
  value,
  caption,
  icon,
  growth,
  analyticsColor,
  trend = [24, 30, 26, 38, 34, 46, 42, 58],
  onClick
}: {
  label: string;
  value: string;
  caption: string;
  icon?: ReactNode;
  growth?: string;
  analyticsColor?: string;
  trend?: number[];
  onClick?: () => void;
}) => {
  const accentStyle = {
    "--stat-accent": analyticsColor ?? "var(--theme-color)"
  } as CSSProperties;

  const content = (
    <div className="relative overflow-hidden" style={accentStyle}>
      <div className="absolute right-0 top-0 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--stat-accent)_12%,white)] text-[var(--stat-accent)] shadow-[0_10px_22px_color-mix(in_srgb,var(--stat-accent)_12%,transparent)]">
        {icon}
      </div>
      <div className="min-w-0 pr-14">
        <p className="min-h-10 text-sm font-bold leading-5 text-slate-700">{label}</p>
      </div>
      <div className="mt-3 min-w-0">
        <p className="stat-card-value block max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-extrabold leading-tight text-slate-950">{value}</p>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-500">{caption}</p>
        {growth ? <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">{growth}</span> : null}
      </div>
      <svg className="mt-4 h-10 w-full" viewBox="0 0 180 42" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`trend-${label.replace(/\W/g, "")}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--stat-accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--stat-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`M0 42 ${trend.map((point, index) => `L${(index / Math.max(1, trend.length - 1)) * 180} ${42 - Math.min(40, point)}`).join(" ")} L180 42 Z`}
          fill={`url(#trend-${label.replace(/\W/g, "")})`}
        />
        <polyline
          points={trend.map((point, index) => `${(index / Math.max(1, trend.length - 1)) * 180},${42 - Math.min(40, point)}`).join(" ")}
          fill="none"
          stroke="var(--stat-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );

  if (onClick) {
    return (
      <button type="button" className="block h-full w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60" onClick={onClick}>
        <GlassCard className="stat-card h-full p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(10,37,64,0.12)] xl:p-6">
          {content}
        </GlassCard>
      </button>
    );
  }

  return (
    <GlassCard className="stat-card p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(10,37,64,0.12)] xl:p-6">
      {content}
    </GlassCard>
  );
};

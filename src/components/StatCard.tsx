import type { CSSProperties, ReactNode } from "react";
import { GlassCard } from "./GlassCard";

export const StatCard = ({
  label,
  value,
  valueTitle,
  caption,
  icon,
  growth,
  analyticsColor,
  variant = "default",
  trend = [24, 30, 26, 38, 34, 46, 42, 58],
  onClick
}: {
  label: string;
  value: string;
  valueTitle?: string;
  caption: string;
  icon?: ReactNode;
  growth?: string;
  analyticsColor?: string;
  variant?: "default" | "flat";
  trend?: number[];
  onClick?: () => void;
}) => {
  const flat = variant === "flat";
  const accentStyle = {
    "--stat-accent": analyticsColor ?? "var(--theme-color)"
  } as CSSProperties;

  const displayTrend = trend && trend.length > 0 ? trend : [24, 30, 26, 38, 34, 46, 42, 58];
  const maxTrend = Math.max(1, ...displayTrend.map((value) => Math.max(0, value)));
  const normalizedTrend = displayTrend.map((value) => (Math.max(0, value) / maxTrend) * 40);

  const content = (
    <div className="relative overflow-hidden" style={accentStyle}>
      <div
        className={`absolute right-0 top-0 flex shrink-0 items-center justify-center ${
          flat ? "h-9 w-9 rounded-lg" : "h-10 w-10 rounded-xl"
        } bg-[color-mix(in_srgb,var(--stat-accent)_12%,white)] text-[var(--stat-accent)] shadow-[0_10px_22px_color-mix(in_srgb,var(--stat-accent)_12%,transparent)]`}
      >
        {icon}
      </div>
      <div className={`min-w-0 ${flat ? "pr-11" : "pr-14"}`}>
        <p className={`${flat ? "fs-12 font-semibold" : "fs-14 font-bold"} min-h-9 leading-5 text-slate-700`}>{label}</p>
      </div>
      <div className="mt-2.5 min-w-0">
        {valueTitle && valueTitle !== value ? (
          <span className="group/statvalue relative block max-w-full">
            <span className="stat-card-value block max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-extrabold leading-tight text-slate-950">{value}</span>
            <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-0 z-50 whitespace-nowrap rounded-lg border border-[var(--panel-border)] bg-[var(--panel-strong)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] opacity-0 shadow-[var(--shadow-panel)] transition group-hover/statvalue:opacity-100">
              {valueTitle}
            </span>
          </span>
        ) : (
          <p className="stat-card-value block max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-extrabold leading-tight text-slate-950">{value}</p>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p title={caption} className={`min-w-0 flex-1 truncate ${flat ? "fs-11" : "fs-12"} font-semibold text-slate-500`}>{caption}</p>
        {growth ? <span className={`shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-600 ${flat ? "fs-11" : "fs-12"}`}>{growth}</span> : null}
      </div>
      <svg className={`${flat ? "mt-3 h-8" : "mt-4 h-10"} w-full`} viewBox="0 0 180 42" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`trend-${label.replace(/\W/g, "")}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--stat-accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--stat-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`M0 42 ${normalizedTrend.map((point, index) => `L${(index / Math.max(1, normalizedTrend.length - 1)) * 180} ${42 - point}`).join(" ")} L180 42 Z`}
          fill={`url(#trend-${label.replace(/\W/g, "")})`}
        />
        <polyline
          points={normalizedTrend.map((point, index) => `${(index / Math.max(1, normalizedTrend.length - 1)) * 180},${42 - point}`).join(" ")}
          fill="none"
          stroke="var(--stat-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );

  if (flat) {
    const flatClass = "stat-card block h-full w-full rounded-lg border border-slate-200 bg-white p-4 text-left shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]";
    if (onClick) {
      return (
        <button type="button" className={`${flatClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60`} onClick={onClick}>
          {content}
        </button>
      );
    }
    return <div className={flatClass}>{content}</div>;
  }

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

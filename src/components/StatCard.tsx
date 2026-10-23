import type { CSSProperties, ReactNode } from "react";
import { GlassCard } from "./GlassCard";

export type StatGrowthTone = "good" | "bad" | "neutral";

const SPARK_WIDTH = 180;
const SPARK_HEIGHT = 42;
const SPARK_TOP_PAD = 4;

/**
 * Smooth sparkline path (monotone cubic — curve kabhi data se upar/neeche overshoot nahi karta,
 * isliye "jhoothi" peak nahi banti).
 */
const sparkPath = (values: number[]) => {
  const max = Math.max(...values.map((value) => Math.max(0, value)));
  const usable = SPARK_HEIGHT - SPARK_TOP_PAD - 2;
  const points = values.map((value, index) => ({
    x: values.length === 1 ? SPARK_WIDTH : (index / (values.length - 1)) * SPARK_WIDTH,
    y: max > 0 ? SPARK_HEIGHT - 1 - (Math.max(0, value) / max) * usable : SPARK_HEIGHT - 1
  }));
  if (points.length === 1) {
    points.unshift({ x: 0, y: points[0].y });
  }
  const slopes = points.slice(0, -1).map((point, index) => (points[index + 1].y - point.y) / (points[index + 1].x - point.x || 1));
  const tangents = points.map((_, index) => {
    if (index === 0) return slopes[0];
    if (index === points.length - 1) return slopes[slopes.length - 1];
    const before = slopes[index - 1];
    const after = slopes[index];
    return before * after <= 0 ? 0 : (before + after) / 2;
  });
  let d = `M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let index = 0; index < points.length - 1; index++) {
    const current = points[index];
    const next = points[index + 1];
    const third = (next.x - current.x) / 3;
    d += ` C${(current.x + third).toFixed(2)} ${(current.y + tangents[index] * third).toFixed(2)}, ${(next.x - third).toFixed(2)} ${(next.y - tangents[index + 1] * third).toFixed(2)}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
  }
  return d;
};

/** "+12.5%" -> good, "-3%" -> bad, "0%" / "New" -> neutral (jab page tone na bataye). */
const inferTone = (growth: string): StatGrowthTone => {
  const trimmed = growth.trim();
  if (trimmed.startsWith("+")) return "good";
  if (trimmed.startsWith("-")) return "bad";
  return "neutral";
};

const growthToneClass: Record<StatGrowthTone, string> = {
  good: "bg-emerald-50 text-emerald-700",
  bad: "bg-rose-50 text-rose-700",
  neutral: "bg-slate-100 text-slate-600"
};

export const StatCard = ({
  label,
  value,
  valueTitle,
  caption,
  icon,
  growth,
  growthTone,
  growthTitle,
  analyticsColor,
  variant = "default",
  trend,
  onClick
}: {
  label: string;
  value: string;
  valueTitle?: string;
  caption: string;
  icon?: ReactNode;
  growth?: string;
  /** Badge ka rang: up hamesha "good" nahi (Outstanding badhna = bad). Default: sign se. */
  growthTone?: StatGrowthTone;
  /** Badge hover text, e.g. "vs previous period". */
  growthTitle?: string;
  analyticsColor?: string;
  variant?: "default" | "flat";
  trend?: number[];
  onClick?: () => void;
}) => {
  const flat = variant === "flat";
  const accentStyle = {
    "--stat-accent": analyticsColor ?? "var(--theme-color)"
  } as CSSProperties;

  // Data nahi / sab zero = seedhi halki baseline (pehle nakli [24,30,...] wave dikhti thi).
  const hasTrend = Boolean(trend && trend.some((value) => Number(value) > 0));
  const linePath = hasTrend && trend ? sparkPath(trend.map((value) => Number(value) || 0)) : "";
  const gradientId = `trend-${label.replace(/\W/g, "")}`;
  const tone = growth ? growthTone ?? inferTone(growth) : "neutral";

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
        {growth ? (
          <span title={growthTitle} className={`shrink-0 rounded-full px-2.5 py-0.5 font-bold ${growthToneClass[tone]} ${flat ? "fs-11" : "fs-12"}`}>
            {growth}
          </span>
        ) : null}
      </div>
      {/* trend prop hi na ho (ratio / count jaise cards) to sparkline area hi nahi. */}
      {trend === undefined ? null : (
      <svg className={`${flat ? "mt-3 h-8" : "mt-4 h-10"} w-full overflow-visible`} viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
        {hasTrend ? (
          <>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--stat-accent)" stopOpacity="0.18" />
                <stop offset="100%" stopColor="var(--stat-accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${linePath} L${SPARK_WIDTH} ${SPARK_HEIGHT} L0 ${SPARK_HEIGHT} Z`} fill={`url(#${gradientId})`} />
            <path
              d={linePath}
              fill="none"
              stroke="var(--stat-accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </>
        ) : (
          <line x1="0" x2={SPARK_WIDTH} y1={SPARK_HEIGHT - 1} y2={SPARK_HEIGHT - 1} stroke="currentColor" className="text-slate-200" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      )}
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

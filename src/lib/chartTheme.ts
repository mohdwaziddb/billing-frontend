import type { CSSProperties, SVGProps } from "react";

/**
 * Shared recharts theme. Inline SVG/HTML rendered by recharts ignores the
 * app's CSS-var overrides, so every chart must take its colors from here
 * (driven by useIsDarkMode) instead of hardcoding them per page.
 */
export type ChartTheme = {
  /** axis tick text + axis line */
  text: string;
  /** cartesian grid lines */
  grid: string;
  /** legend text */
  legend: string;
  /** tooltip box */
  tooltipContentStyle: CSSProperties;
  /** tooltip row text */
  tooltipItemStyle: CSSProperties;
  /** tooltip title (label) text — recharts defaults to black, unreadable on dark bg */
  tooltipLabelStyle: CSSProperties;
  /** hover cursor wash over bars/areas */
  tooltipCursor: SVGProps<SVGElement>;
};

export const CHART_PALETTE = ["#38bdf8", "#10b981", "#f97316", "#a78bfa", "#f43f5e"];

export const getChartTheme = (isDark: boolean): ChartTheme => isDark
  ? {
      text: "#cbd5e1",
      grid: "#334155",
      legend: "#cbd5e1",
      tooltipContentStyle: {
        background: "rgba(15,23,42,0.96)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 16,
        color: "#f1f5f9"
      },
      tooltipItemStyle: { color: "#e2e8f0" },
      tooltipLabelStyle: { color: "#ffffff" },
      tooltipCursor: { fill: "rgba(148,163,184,0.12)" }
    }
  : {
      text: "#475569",
      grid: "#e8edf5",
      legend: "#475569",
      tooltipContentStyle: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 16,
        color: "#0f172a",
        boxShadow: "0 18px 50px rgba(10,37,64,0.16)"
      },
      tooltipItemStyle: { color: "#334155" },
      tooltipLabelStyle: { color: "#0f172a" },
      tooltipCursor: { fill: "rgba(148,163,184,0.12)" }
    };

/**
 * Analytics trend buckets ki asli dates. Backend rule (AnalyticsService.buildPeriodStarts):
 * range <= 45 din = har din ek bucket, warna har mahina ek bucket — index 1 se.
 * Label backend ke text par nirbhar nahi (purana backend sirf "15" / "Oct" bhejta tha).
 */
export type ChartPeriod = {
  /** Axis ke liye chhota: "15 Oct" / "Oct 26" */
  axisLabel: string;
  /** Tooltip / table ke liye poora: "Thu, 15 Oct 2026" / "October 2026" */
  fullLabel: string;
  daily: boolean;
};

const DAILY_BUCKET_MAX_DAYS = 45;

const parseIso = (iso: string) => {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const dayDiff = (start: Date, end: Date) => Math.round((end.getTime() - start.getTime()) / 86_400_000);

export const buildChartPeriods = (startIso: string | null | undefined, endIso: string | null | undefined, count: number): ChartPeriod[] | null => {
  if (!startIso || !endIso || count <= 0) {
    return null;
  }
  const start = parseIso(startIso);
  const end = parseIso(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }
  const daily = dayDiff(start, end) <= DAILY_BUCKET_MAX_DAYS;
  return Array.from({ length: count }, (_, offset) => {
    if (daily) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
      return {
        daily,
        axisLabel: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        // "Thu, 15 Oct 2026" (en-IN ka default "15 Oct, 2026" comma deta hai).
        fullLabel: `${date.toLocaleDateString("en-IN", { weekday: "short" })}, ${date.getDate()} ${date.toLocaleDateString("en-IN", { month: "short" })} ${date.getFullYear()}`
      };
    }
    const date = new Date(start.getFullYear(), start.getMonth() + offset, 1);
    return {
      daily,
      axisLabel: date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
      fullLabel: date.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    };
  });
};

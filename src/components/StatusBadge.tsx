import clsx from "clsx";

export const StatusBadge = ({ label }: { label: string }) => {
  const normalized = label.toUpperCase();

  return (
    <span
      className={clsx(
        "inline-flex rounded-full border px-3 py-1 text-xs font-semibold tracking-wide",
        normalized === "PAID" && "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
        normalized === "PARTIAL" && "border-amber-300/30 bg-amber-300/10 text-amber-100",
        normalized === "UNPAID" && "border-rose-300/30 bg-rose-300/10 text-rose-200",
        normalized === "SENT" && "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
        normalized === "FAILED" && "border-rose-300/30 bg-rose-300/10 text-rose-200",
        normalized === "PENDING" && "border-amber-300/30 bg-amber-300/10 text-amber-100",
        normalized === "ACTIVE" && "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
        normalized === "INACTIVE" && "border-slate-300/20 bg-slate-300/10 text-slate-200",
        !["PAID", "PARTIAL", "UNPAID", "SENT", "FAILED", "PENDING", "ACTIVE", "INACTIVE"].includes(normalized) &&
          "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
      )}
    >
      {label.replace(/_/g, " ")}
    </span>
  );
};

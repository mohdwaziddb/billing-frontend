import clsx from "clsx";

export const StatusBadge = ({ label }: { label?: string | null }) => {
  const displayLabel = typeof label === "string" && label.trim() ? label.trim() : "Unknown";
  const normalized = displayLabel.toUpperCase();

  return (
    <span
      className={clsx(
        "status-badge inline-flex rounded-full border px-3 py-1 text-xs font-semibold tracking-wide",
        (normalized === "PAID" || normalized === "SENT") && "status-badge-success",
        (normalized === "PARTIAL" || normalized === "PENDING") && "status-badge-warning",
        (normalized === "UNPAID" || normalized === "FAILED" || normalized === "DELETED") && "status-badge-danger",
        normalized === "ACTIVE" && "status-badge-active",
        normalized === "INACTIVE" && "status-badge-muted",
        normalized === "UNKNOWN" && "status-badge-muted",
        !["PAID", "PARTIAL", "UNPAID", "SENT", "FAILED", "PENDING", "ACTIVE", "INACTIVE", "UNKNOWN", "DELETED"].includes(normalized) &&
          "status-badge-active"
      )}
    >
      {displayLabel.replace(/_/g, " ")}
    </span>
  );
};

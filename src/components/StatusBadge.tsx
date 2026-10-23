import clsx from "clsx";

export const StatusBadge = ({ label }: { label?: string | null }) => {
  const displayLabel = typeof label === "string" && label.trim() ? label.trim() : "Unknown";
  const normalized = displayLabel.toUpperCase();

  return (
    <span
      className={clsx(
        "status-badge inline-flex rounded-full border px-2.5 py-0.5 fs-11 font-semibold tracking-wide",
        (normalized === "PAID" || normalized === "SENT" || normalized === "SUCCESS") && "status-badge-success",
        (normalized === "PARTIAL" || normalized === "PENDING" || normalized === "CREATED") && "status-badge-warning",
        (normalized === "UNPAID" || normalized === "FAILED" || normalized === "DELETED") && "status-badge-danger",
        normalized === "ACTIVE" && "status-badge-active",
        normalized === "ON" && "status-badge-success",
        (normalized === "OFF" || normalized === "INACTIVE" || normalized === "UNKNOWN" || normalized === "CANCELLED" || normalized === "EXPIRED") && "status-badge-muted",
        !["PAID", "PARTIAL", "UNPAID", "SENT", "SUCCESS", "FAILED", "PENDING", "CREATED", "ACTIVE", "ON", "OFF", "INACTIVE", "UNKNOWN", "DELETED", "CANCELLED", "EXPIRED"].includes(normalized) &&
          "status-badge-active"
      )}
    >
      {displayLabel.replace(/_/g, " ")}
    </span>
  );
};

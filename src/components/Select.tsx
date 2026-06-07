import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { forwardRef, type SelectHTMLAttributes } from "react";
import type { Option } from "../types/forms";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  options: Option[];
  requiredMark?: boolean;
  placeholder?: string | null;
  hint?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, requiredMark = false, placeholder, hint, ...props }, ref) => {
  const resolvedPlaceholder = placeholder === null ? undefined : (placeholder ?? (label ? `Select ${label}` : undefined));
  const hasEmptyOption = options.some((option) => String(option.value) === "");
  const computedOptions =
    resolvedPlaceholder && !hasEmptyOption
      ? [{ label: resolvedPlaceholder, value: "" }, ...options]
      : options;

  return (
    <label className="block space-y-2">
      {label ? (
        <span className="block text-sm font-semibold text-slate-700">
          {label}
          {requiredMark ? <span className="ml-1 text-rose-400">*</span> : null}
        </span>
      ) : null}
      <div className="relative">
        <select
          ref={ref}
          className={clsx(
            "w-full appearance-none rounded-[var(--radius-control)] border bg-white px-4 py-3 pr-12 text-sm font-medium text-slate-900 outline-none transition disabled:bg-slate-50 disabled:text-slate-500 focus:border-[var(--theme-color)] focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_14%,transparent)]",
            error ? "border-rose-400/70" : "border-slate-200",
            className
          )}
          {...props}
        >
          {computedOptions.map((option) => (
            <option key={String(option.value)} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
      </div>
      {error ? <span className="block text-xs text-rose-600">{error}</span> : hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
});

Select.displayName = "Select";

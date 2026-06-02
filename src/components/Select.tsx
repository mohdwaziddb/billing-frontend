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
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, requiredMark = false, placeholder, ...props }, ref) => {
  const resolvedPlaceholder = placeholder === null ? undefined : (placeholder ?? (label ? `Select ${label}` : undefined));
  const hasEmptyOption = options.some((option) => String(option.value) === "");
  const computedOptions =
    resolvedPlaceholder && !hasEmptyOption
      ? [{ label: resolvedPlaceholder, value: "" }, ...options]
      : options;

  return (
    <label className="block">
      {label ? (
        <span className="mb-2 block text-sm font-semibold text-slate-100">
          {label}
          {requiredMark ? <span className="ml-1 text-rose-400">*</span> : null}
        </span>
      ) : null}
      <div className="relative">
        <select
          ref={ref}
          className={clsx(
            "w-full appearance-none rounded-2xl border bg-slate-950/90 px-4 py-3 pr-12 text-sm font-medium text-slate-50 outline-none transition focus:border-cyan-300/60 focus:bg-slate-900/95",
            error ? "border-rose-400/60" : "border-white/10",
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
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
      </div>
      {error ? <span className="mt-2 block text-xs text-rose-300">{error}</span> : null}
    </label>
  );
});

Select.displayName = "Select";

import clsx from "clsx";
import { forwardRef, type InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  requiredMark?: boolean;
  hint?: string;
};

const buildPlaceholder = (label?: string, placeholder?: string, type?: string) => {
  if (placeholder || !label) {
    return placeholder;
  }

  if (type === "date") {
    return undefined;
  }

  return `Enter ${label}`;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, requiredMark = false, placeholder, type, hint, onKeyDown, onWheel, inputMode, ...props }, ref) => {
  const isNumberInput = type === "number";

  return (
    <label className="block space-y-2">
      {label ? (
        <span className="block text-sm font-semibold text-slate-700">
          {label}
          {requiredMark ? <span className="ml-1 text-rose-400">*</span> : null}
        </span>
      ) : null}
      <input
        ref={ref}
        className={clsx(
          "w-full rounded-[var(--radius-control)] border bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500 focus:border-[var(--theme-color)] focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_14%,transparent)]",
          error ? "border-rose-400/70" : "border-slate-200",
          className
        )}
        placeholder={buildPlaceholder(label, placeholder, type)}
        type={type}
        inputMode={isNumberInput ? "decimal" : inputMode}
        onKeyDown={(event) => {
          if (isNumberInput && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
            event.preventDefault();
            return;
          }
          onKeyDown?.(event);
        }}
        onWheel={(event) => {
          if (isNumberInput) {
            event.currentTarget.blur();
            event.preventDefault();
            return;
          }
          onWheel?.(event);
        }}
        {...props}
      />
      {error ? <span className="block text-xs text-rose-600">{error}</span> : hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
});

Input.displayName = "Input";

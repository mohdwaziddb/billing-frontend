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
        <span className="block text-sm font-semibold text-slate-100">
          {label}
          {requiredMark ? <span className="ml-1 text-rose-400">*</span> : null}
        </span>
      ) : null}
      <input
        ref={ref}
        className={clsx(
          "w-full rounded-[var(--radius-control)] border bg-[var(--panel-strong)] px-4 py-3 text-sm font-medium text-slate-50 outline-none transition placeholder:text-slate-500 focus:border-sky-300/50 focus:bg-slate-900/98 focus:ring-2 focus:ring-sky-300/20",
          error ? "border-rose-400/60" : "border-white/10",
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
      {error ? <span className="block text-xs text-rose-300">{error}</span> : hint ? <span className="block text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
});

Input.displayName = "Input";

import clsx from "clsx";
import { forwardRef, type InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  requiredMark?: boolean;
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
  ({ label, error, className, requiredMark = false, placeholder, type, ...props }, ref) => {
  return (
    <label className="block">
      {label ? (
        <span className="mb-2 block text-sm font-semibold text-slate-100">
          {label}
          {requiredMark ? <span className="ml-1 text-rose-400">*</span> : null}
        </span>
      ) : null}
      <input
        ref={ref}
        className={clsx(
          "w-full rounded-2xl border bg-slate-950/85 px-4 py-3 text-sm font-medium text-slate-50 outline-none transition placeholder:text-slate-400 focus:border-cyan-300/60 focus:bg-slate-900/95",
          error ? "border-rose-400/60" : "border-white/10",
          className
        )}
        placeholder={buildPlaceholder(label, placeholder, type)}
        type={type}
        {...props}
      />
      {error ? <span className="mt-2 block text-xs text-rose-300">{error}</span> : null}
    </label>
  );
});

Input.displayName = "Input";

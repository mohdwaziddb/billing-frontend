import clsx from "clsx";
import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState, type InputHTMLAttributes } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  error?: string;
  requiredMark?: boolean;
  hint?: string;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, className, requiredMark = false, hint, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <label className="block space-y-2">
        {label ? (
          <span className="block text-sm font-semibold text-slate-700">
            {label}
            {requiredMark ? <span className="ml-1 text-rose-400">*</span> : null}
          </span>
        ) : null}
        <div className="relative">
          <input
            ref={ref}
            className={clsx(
              "w-full rounded-[var(--radius-control)] border bg-white px-4 py-3 pr-12 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500 focus:border-[var(--theme-color)] focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_14%,transparent)]",
              error ? "border-rose-400/70" : "border-slate-200",
              className
            )}
            placeholder={label ? `Enter ${label}` : undefined}
            type={visible ? "text" : "password"}
            {...props}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
      </label>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

import clsx from "clsx";
import { X } from "lucide-react";
import { forwardRef, useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { DatePicker } from "./DatePicker";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  requiredMark?: boolean;
  hint?: string;
  onClear?: () => void;
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
  ({ label, error, className, requiredMark = false, placeholder, type, hint, onKeyDown, onWheel, inputMode, onChange, onInput, onClear, value, defaultValue, disabled, readOnly, ...props }, ref) => {
  const isNumberInput = type === "number";
  if (type === "date") {
    return <DatePicker ref={ref} label={label} error={error} requiredMark={requiredMark} hint={hint} className={className} disabled={disabled} readOnly={readOnly} value={value} defaultValue={defaultValue} onChange={onChange} {...props} />;
  }
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [hasValue, setHasValue] = useState(Boolean(value ?? defaultValue));
  const resolvedType = type ?? "text";
  const canClear = !disabled && !readOnly && ["email", "search", "tel", "text", "url"].includes(resolvedType);

  useEffect(() => {
    if (value !== undefined) {
      setHasValue(String(value).length > 0);
    }
  }, [value]);

  const setRefs = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  const clearValue = () => {
    const input = inputRef.current;
    if (!input) {
      return;
    }
    input.value = "";
    setHasValue(false);
    onChange?.({ target: input, currentTarget: input } as React.ChangeEvent<HTMLInputElement>);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    onClear?.();
    input.focus();
  };

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
          ref={setRefs}
          className={clsx(
            "w-full rounded-[var(--radius-control)] border bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500 focus:border-[var(--theme-color)] focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_14%,transparent)]",
            canClear ? "pr-11" : "",
            error ? "border-rose-400/70" : "border-slate-200",
            className
          )}
          placeholder={buildPlaceholder(label, placeholder, type)}
          type={type}
          inputMode={isNumberInput ? "decimal" : inputMode}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          readOnly={readOnly}
          onChange={(event) => {
            setHasValue(event.currentTarget.value.length > 0);
            onChange?.(event);
          }}
          onInput={(event) => {
            setHasValue(event.currentTarget.value.length > 0);
            onInput?.(event);
          }}
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
        {canClear && hasValue ? (
          <button
            type="button"
            aria-label="Clear field"
            title="Clear"
            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={clearValue}
          >
            <X size={15} />
          </button>
        ) : null}
      </div>
      {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
});

Input.displayName = "Input";

import clsx from "clsx";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { forwardRef, useEffect, useMemo, useRef, useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { formatDateInputDisplay } from "../lib/format";

type DatePickerProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> & {
  label?: string;
  error?: string;
  requiredMark?: boolean;
  hint?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

const toIso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const todayIso = () => toIso(new Date());
const fromIso = (value?: string | number | readonly string[]) => {
  if (typeof value !== "string") {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(({ label, error, requiredMark, hint, value, defaultValue, onChange, className, disabled, name, onBlur, id }, ref) => {
  const [internalValue, setInternalValue] = useState(typeof defaultValue === "string" && defaultValue ? defaultValue : todayIso());
  const currentValue = typeof value === "string" ? value : internalValue;
  const initialDate = fromIso(currentValue || defaultValue) ?? new Date();
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(initialDate);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const next = fromIso(currentValue);
    if (next) {
      setViewDate(next);
    }
  }, [currentValue]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const close = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [open]);

  const days = useMemo(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [viewDate]);

  const emitChange = (nextValue: string) => {
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onChange?.({ target: { name, value: nextValue }, currentTarget: { name, value: nextValue } } as ChangeEvent<HTMLInputElement>);
  };

  const chooseDate = (date: Date) => {
    emitChange(toIso(date));
    setOpen(false);
  };

  const panel = open && buttonRef.current
    ? createPortal(
        <div
          ref={panelRef}
          className="fixed z-[1100] w-80 rounded-2xl border border-slate-200 bg-white p-3 text-slate-800 shadow-[0_24px_70px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          style={{
            left: Math.min(buttonRef.current.getBoundingClientRect().left, window.innerWidth - 332),
            top: Math.min(buttonRef.current.getBoundingClientRect().bottom + 8, window.innerHeight - 390)
          }}
        >
          <div className="mb-3 flex items-center gap-2">
            <button type="button" className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>
              <ChevronLeft size={17} />
            </button>
            <select className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900" value={viewDate.getMonth()} onChange={(event) => setViewDate(new Date(viewDate.getFullYear(), Number(event.target.value), 1))}>
              {Array.from({ length: 12 }, (_, month) => <option key={month} value={month}>{new Date(2025, month, 1).toLocaleString("en-IN", { month: "long" })}</option>)}
            </select>
            <select className="w-24 rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900" value={viewDate.getFullYear()} onChange={(event) => setViewDate(new Date(Number(event.target.value), viewDate.getMonth(), 1))}>
              {Array.from({ length: 81 }, (_, index) => viewDate.getFullYear() - 40 + index).map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
            <button type="button" className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>
              <ChevronRight size={17} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase text-slate-400">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <div key={`${day}-${index}`} className="py-1">{day}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((day) => {
              const iso = toIso(day);
              const selected = iso === currentValue;
              const muted = day.getMonth() !== viewDate.getMonth();
              return (
                <button
                  key={iso}
                  type="button"
                  className={clsx("h-9 rounded-xl text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--theme-color)]", selected ? "bg-[var(--theme-color)] text-white" : muted ? "text-slate-300 hover:bg-slate-50 dark:text-slate-600 dark:hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800")}
                  onClick={() => chooseDate(day)}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <label className="block space-y-2">
      {label ? <span className="block text-sm font-semibold text-slate-700">{label}{requiredMark ? <span className="ml-1 text-rose-400">*</span> : null}</span> : null}
      <button
        id={id}
        ref={buttonRef}
        type="button"
        disabled={disabled}
        className={clsx("flex w-full items-center gap-3 rounded-[var(--radius-control)] border bg-white px-4 py-3 text-left text-sm font-medium text-slate-900 outline-none transition disabled:bg-slate-50 disabled:text-slate-500 focus:border-[var(--theme-color)] focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_14%,transparent)]", error ? "border-rose-400/70" : "border-slate-200", className)}
        onClick={() => setOpen((current) => !current)}
        onBlur={onBlur as any}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((current) => !current);
          }
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      >
        <span className={clsx("min-w-0 flex-1", currentValue ? "text-slate-900" : "text-slate-400")}>{currentValue ? formatDateInputDisplay(String(currentValue)) : "Select date"}</span>
        <CalendarDays size={18} className="shrink-0 text-slate-400" />
      </button>
      <input ref={ref} type="hidden" name={name} value={currentValue} readOnly />
      {panel}
      {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
});

DatePicker.displayName = "DatePicker";

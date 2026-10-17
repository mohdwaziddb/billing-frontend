import clsx from "clsx";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { forwardRef, useEffect, useMemo, useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { useAnchoredPanel } from "../hooks/useAnchoredPanel";
import { formatDateInputDisplay } from "../lib/format";

type DatePickerProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> & {
  label?: string;
  error?: string;
  requiredMark?: boolean;
  hint?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  const [viewDate, setViewDate] = useState(initialDate);
  const { open, setOpen, toggle, buttonRef, panelRef, panelStyle } = useAnchoredPanel({
    panelWidth: (panel) => panel?.offsetWidth ?? 352,
    panelHeight: (panel) => panel?.offsetHeight ?? 430
  });

  useEffect(() => {
    const next = fromIso(currentValue);
    if (next) {
      setViewDate(next);
    }
  }, [currentValue]);

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

  const handleToggle = () => {
    if (!open) {
      setViewDate(fromIso(currentValue) ?? new Date());
    }
    toggle();
  };

  const chooseDate = (date: Date) => {
    emitChange(toIso(date));
    setOpen(false);
  };

  const chooseToday = () => {
    const now = new Date();
    setViewDate(now);
    emitChange(todayIso());
    setOpen(false);
  };

  const clearValue = () => {
    emitChange("");
    setOpen(false);
  };

  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          className="fixed z-[1100] w-[352px] rounded-xl border border-slate-200 bg-white p-3 text-slate-800 shadow-[0_24px_70px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          style={{ left: panelStyle.left, top: panelStyle.top }}
        >
          <div className="flex items-stretch gap-3">
            <div className="flex w-14 shrink-0 flex-col gap-0.5 rounded-xl border border-slate-100 bg-slate-50 p-1 dark:border-slate-700/60 dark:bg-slate-800/50">
              <button type="button" aria-label="Previous year" className="grid h-6 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100" onClick={() => setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1))}>
                <ChevronUp size={14} />
              </button>
              {MONTH_SHORT.map((month, index) => (
                <button
                  key={month}
                  type="button"
                  className={clsx(
                    "min-h-0 flex-1 rounded-lg text-xs font-bold transition",
                    index === viewDate.getMonth()
                      ? "bg-[var(--theme-color)] text-white"
                      : "text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                  )}
                  onClick={() => setViewDate(new Date(viewDate.getFullYear(), index, 1))}
                >
                  {month}
                </button>
              ))}
              <button type="button" aria-label="Next year" className="grid h-6 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100" onClick={() => setViewDate(new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1))}>
                <ChevronDown size={14} />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-1.5">
                <button type="button" aria-label="Previous month" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>
                  <ChevronLeft size={16} />
                </button>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{MONTH_NAMES[viewDate.getMonth()]}</span>
                <select className="cursor-pointer rounded-lg border-0 bg-transparent py-1 text-sm font-semibold text-slate-800 outline-none dark:text-slate-100" value={viewDate.getFullYear()} onChange={(event) => setViewDate(new Date(Number(event.target.value), viewDate.getMonth(), 1))}>
                  {Array.from({ length: 81 }, (_, index) => viewDate.getFullYear() - 40 + index).map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
                <button type="button" aria-label="Next month" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                {WEEKDAYS.map((day) => <div key={day} className="py-1">{day}</div>)}
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
                      className={clsx("h-8 rounded-lg text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--theme-color)]", selected ? "bg-[var(--theme-color)] text-white" : muted ? "text-slate-300 hover:bg-slate-50 dark:text-slate-600 dark:hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800")}
                      onClick={() => chooseDate(day)}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
                <button type="button" className="rounded-lg px-2 py-1 text-xs font-bold text-[var(--theme-color)] transition hover:bg-slate-100 dark:hover:bg-slate-800" onClick={chooseToday}>
                  Today
                </button>
                <button type="button" className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200" onClick={clearValue}>
                  Clear
                </button>
                <button type="button" className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800" onClick={() => setOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
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
        onClick={handleToggle}
        onBlur={onBlur as any}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleToggle();
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

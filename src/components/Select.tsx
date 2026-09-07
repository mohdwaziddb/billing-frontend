import clsx from "clsx";
import { Check, ChevronDown, Search, X } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type SelectHTMLAttributes,
} from "react";
import type { Option } from "../types/forms";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  options: Option[];
  requiredMark?: boolean;
  placeholder?: string | null;
  hint?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  density?: "md" | "sm";
  wrapperClassName?: string;
};

const SEARCH_THRESHOLD = 6;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      options,
      className,
      requiredMark = false,
      placeholder,
      hint,
      searchable,
      searchPlaceholder = "Search options...",
      emptyText = "No matches found",
      density = "md",
      wrapperClassName,
      value,
      defaultValue,
      onChange,
      onBlur,
      disabled,
      ...rest
    },
    ref
  ) => {
    const resolvedPlaceholder =
      placeholder === null
        ? undefined
        : placeholder ?? (label ? `Select ${label}` : undefined);

    const computedOptions = useMemo(() => {
      const hasEmptyOption = options.some((option) => String(option.value) === "");
      if (resolvedPlaceholder && !hasEmptyOption) {
        return [{ label: resolvedPlaceholder, value: "" }, ...options];
      }
      return options;
    }, [options, resolvedPlaceholder]);

    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState(() => String(defaultValue ?? ""));
    const currentValue = isControlled ? String(value ?? "") : internalValue;

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const nativeRef = useRef<HTMLSelectElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const searchRef = useRef<HTMLInputElement | null>(null);
    const listId = useId();

    const showSearch = searchable ?? computedOptions.length > SEARCH_THRESHOLD;

    const filtered = useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) {
        return computedOptions;
      }
      return computedOptions.filter((option) => option.label.toLowerCase().includes(q));
    }, [computedOptions, query]);

    const selectedOption = computedOptions.find(
      (option) => String(option.value) === currentValue
    );
    const hasSelection = Boolean(selectedOption) && currentValue !== "";
    const displayLabel =
      selectedOption?.label ?? resolvedPlaceholder ?? computedOptions[0]?.label ?? "";

    const setRefs = (node: HTMLSelectElement | null) => {
      nativeRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const emitChange = (next: string) => {
      if (!isControlled) {
        setInternalValue(next);
      }
      const native = nativeRef.current;
      if (native) {
        native.value = next;
        onChange?.({ target: native, currentTarget: native } as React.ChangeEvent<HTMLSelectElement>);
      } else {
        onChange?.({
          target: { value: next, name: rest.name },
          currentTarget: { value: next, name: rest.name },
        } as unknown as React.ChangeEvent<HTMLSelectElement>);
      }
    };

    const handleNativeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
      if (!isControlled) {
        setInternalValue(event.target.value);
      }
      onChange?.(event);
    };

    const close = () => {
      setOpen(false);
      setQuery("");
    };

    const choose = (next: string) => {
      emitChange(next);
      close();
      buttonRef.current?.focus();
    };

    useEffect(() => {
      if (!open) {
        return;
      }
      setQuery("");
      const selectedAt = computedOptions.findIndex(
        (option) => String(option.value) === currentValue
      );
      setActiveIndex(selectedAt >= 0 ? selectedAt : 0);
      if (showSearch) {
        searchRef.current?.focus();
      }
    }, [open, computedOptions, currentValue, showSearch]);

    useEffect(() => {
      setActiveIndex(0);
    }, [query]);

    useEffect(() => {
      if (!open) {
        return;
      }
      document
        .getElementById(`${listId}-opt-${activeIndex}`)
        ?.scrollIntoView({ block: "nearest" });
    }, [activeIndex, open, listId]);

    useEffect(() => {
      if (!open) {
        return;
      }
      const onPointerDown = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          close();
        }
      };
      document.addEventListener("mousedown", onPointerDown);
      return () => document.removeEventListener("mousedown", onPointerDown);
    }, [open]);

    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (disabled) {
        return;
      }
      const typingInSearch =
        document.activeElement === searchRef.current && event.key === " ";
      if (typingInSearch) {
        return;
      }
      if (!open) {
        if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setOpen(true);
        }
        return;
      }
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          close();
          buttonRef.current?.focus();
          break;
        case "ArrowDown":
          event.preventDefault();
          setActiveIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
          break;
        case "ArrowUp":
          event.preventDefault();
          setActiveIndex((index) => Math.max(index - 1, 0));
          break;
        case "Enter":
          event.preventDefault();
          if (filtered[activeIndex]) {
            choose(String(filtered[activeIndex].value));
          }
          break;
        case "Tab":
          close();
          break;
        default:
          break;
      }
    };

    return (
      <div className={clsx("block space-y-2", wrapperClassName)}>
        {label ? (
          <span className="block text-sm font-semibold text-slate-700">
            {label}
            {requiredMark ? <span className="ml-1 text-rose-400">*</span> : null}
          </span>
        ) : null}
        <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
          <button
            ref={buttonRef}
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={label ?? rest["aria-label"] ?? "Select option"}
            title={displayLabel}
            onClick={() => {
              if (!disabled) {
                setOpen((prev) => !prev);
              }
            }}
            className={clsx(
              "flex w-full items-center justify-between gap-2 rounded-[var(--radius-control)] border bg-white text-sm font-medium outline-none transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 focus:border-[var(--theme-color)] focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_14%,transparent)]",
              density === "sm" ? "px-3 py-2 text-[13px]" : "px-4 py-3",
              error ? "border-rose-400/70" : "border-slate-200",
              hasSelection ? "text-slate-900" : "text-slate-400",
              className
            )}
          >
            <span className="block min-w-0 flex-1 truncate text-left">{displayLabel}</span>
            <ChevronDown
              size={18}
              className={clsx("shrink-0 text-slate-500 transition-transform", open && "rotate-180")}
            />
          </button>
          {open && !disabled ? (
            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-[var(--radius-control)] border border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-[var(--shadow-panel)]">
              {showSearch ? (
                <div className="border-b border-[var(--panel-border)] p-2">
                  <div className="relative">
                    <Search
                      size={15}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      ref={searchRef}
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={searchPlaceholder}
                      aria-label={searchPlaceholder}
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-[var(--theme-color)]"
                    />
                    {query ? (
                      <button
                        type="button"
                        aria-label="Clear search"
                        title="Clear search"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setQuery("");
                          searchRef.current?.focus();
                        }}
                        className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        <X size={14} />
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <ul
                role="listbox"
                id={listId}
                aria-label={label ?? "Options"}
                className="max-h-64 overflow-auto p-1.5"
              >
                {filtered.length === 0 ? (
                  <li className="px-3 py-2.5 text-sm font-medium text-slate-400">{emptyText}</li>
                ) : null}
                {filtered.map((option, index) => {
                  const optionValue = String(option.value);
                  const selected = optionValue === currentValue;
                  const active = index === activeIndex;
                  const isPlaceholder = optionValue === "";
                  return (
                    <li
                      key={`${optionValue}-${index}`}
                      id={`${listId}-opt-${index}`}
                      role="option"
                      aria-selected={selected}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => choose(optionValue)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={clsx(
                        "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                        selected
                          ? "bg-[color:color-mix(in_srgb,var(--theme-color)_12%,transparent)] text-slate-900"
                          : active
                            ? "bg-slate-100 text-slate-900"
                            : "text-slate-700",
                        isPlaceholder && !selected && "font-normal text-slate-400"
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                      {selected ? (
                        <Check size={16} className="shrink-0 text-[var(--theme-color)]" />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          <select
            ref={setRefs}
            {...rest}
            value={currentValue}
            onChange={handleNativeChange}
            onBlur={onBlur}
            disabled={disabled}
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
          >
            {computedOptions.map((option, index) => (
              <option key={`${String(option.value)}-${index}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {error ? (
          <span className="block text-xs font-medium text-rose-500">{error}</span>
        ) : null}
        {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
      </div>
    );
  }
);

Select.displayName = "Select";

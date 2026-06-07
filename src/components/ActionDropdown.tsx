import clsx from "clsx";
import { MoreVertical } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

export type ActionDropdownItem = {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  to?: string;
  disabled?: boolean;
  danger?: boolean;
  hidden?: boolean;
};

type MenuPosition = {
  left: number;
  top: number;
};

export const ActionDropdown = ({
  actions,
  label = "More actions"
}: {
  actions: ActionDropdownItem[];
  label?: string;
}) => {
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ left: 0, top: 0 });
  const visibleActions = actions.filter((action) => !action.hidden);

  const updatePosition = () => {
    const button = buttonRef.current;
    const menu = menuRef.current;
    if (!button) {
      return;
    }

    const buttonRect = button.getBoundingClientRect();
    const menuWidth = menu?.offsetWidth ?? 220;
    const menuHeight = menu?.offsetHeight ?? Math.min(visibleActions.length * 44 + 16, 320);
    const gap = 8;
    const margin = 12;
    const left = Math.min(
      Math.max(margin, buttonRect.right - menuWidth),
      window.innerWidth - menuWidth - margin
    );
    const opensUp = buttonRect.bottom + gap + menuHeight > window.innerHeight - margin;
    const top = opensUp
      ? Math.max(margin, buttonRect.top - menuHeight - gap)
      : Math.min(buttonRect.bottom + gap, window.innerHeight - menuHeight - margin);

    setPosition({ left, top });
  };

  useLayoutEffect(() => {
    if (open) {
      updatePosition();
    }
  }, [open, visibleActions.length]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    const handleWindowChange = () => updatePosition();

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
  }, [open]);

  if (!visibleActions.length) {
    return <span className="text-sm text-slate-500">View only</span>;
  }

  return (
    <div className="flex justify-end">
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-[color:color-mix(in_srgb,var(--theme-color)_28%,#d8e0ec)] hover:bg-[color-mix(in_srgb,var(--theme-color)_7%,white)] hover:text-[var(--theme-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--theme-color)_30%,transparent)]"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreVertical size={18} />
      </button>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[1000] w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 text-sm shadow-[0_24px_70px_rgba(15,23,42,0.16)]"
              style={{ left: position.left, top: position.top }}
            >
              {visibleActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  role="menuitem"
                  disabled={action.disabled}
                  className={clsx(
                    "flex min-h-10 w-full items-center gap-3 rounded-[14px] px-3 py-2 text-left font-semibold transition disabled:cursor-not-allowed disabled:opacity-45",
                    action.danger
                      ? "text-rose-600 hover:bg-rose-50"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                  )}
                  onClick={() => {
                    if (action.disabled) {
                      return;
                    }
                    setOpen(false);
                    if (action.to) {
                      navigate(action.to);
                    }
                    action.onClick?.();
                  }}
                >
                  {action.icon ? <span className="flex h-4 w-4 shrink-0 items-center justify-center">{action.icon}</span> : null}
                  <span className="min-w-0 truncate">{action.label}</span>
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </div>
  );
};

import clsx from "clsx";
import { MoreVertical } from "lucide-react";
import { type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAnchoredPanel } from "../hooks/useAnchoredPanel";

export type ActionDropdownItem = {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  to?: string;
  disabled?: boolean;
  danger?: boolean;
  hidden?: boolean;
};

export const ActionDropdown = ({
  actions,
  label = "More actions"
}: {
  actions: ActionDropdownItem[];
  label?: string;
}) => {
  const navigate = useNavigate();
  const visibleActions = actions.filter((action) => !action.hidden);
  const { open, setOpen, toggle, buttonRef, panelRef, panelStyle } = useAnchoredPanel({
    panelWidth: (panel) => panel?.offsetWidth ?? 220,
    panelHeight: (panel) => panel?.offsetHeight ?? Math.min(visibleActions.length * 44 + 16, 320)
  });

  if (!visibleActions.length) {
    return <span className="text-sm text-slate-500">View only</span>;
  }

  return (
    <div className="flex justify-end">
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] border border-slate-200 bg-white text-slate-500 transition hover:border-[color:color-mix(in_srgb,var(--theme-color)_28%,#d8e0ec)] hover:bg-[color-mix(in_srgb,var(--theme-color)_7%,white)] hover:text-[var(--theme-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--theme-color)_30%,transparent)]"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={toggle}
      >
        <MoreVertical size={18} />
      </button>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              className="fixed z-[1000] w-56 overflow-hidden rounded-lg border border-slate-200 bg-white p-1.5 text-sm shadow-[0_24px_70px_rgba(15,23,42,0.16)]"
              style={{ left: panelStyle.left, top: panelStyle.top }}
            >
              {visibleActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  role="menuitem"
                  disabled={action.disabled}
                  className={clsx(
                    "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-semibold transition disabled:cursor-not-allowed disabled:opacity-45",
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

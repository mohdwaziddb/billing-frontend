import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { gradientSurfaceClass } from "../lib/theme";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "default" | "icon-sm";
};

export const Button = ({ children, className, variant = "primary", size = "default", ...props }: ButtonProps) => {
  return (
    <button
      className={clsx(
        "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-control)] border fs-13 font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--theme-color)_35%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60",
        size === "default" ? "min-h-9 px-4 py-2" : "h-8 w-8 p-0",
        variant === "primary" &&
          `${gradientSurfaceClass} shadow-[0_1px_2px_rgba(2,6,23,0.16)]`,
        variant === "secondary" &&
          "border-[color:color-mix(in_srgb,var(--theme-color)_26%,#d8e0ec)] bg-white text-[var(--theme-dark)] hover:bg-[color:color-mix(in_srgb,var(--theme-color)_7%,white)]",
        variant === "ghost" &&
          "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950",
        variant === "danger" &&
          "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-400/30 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

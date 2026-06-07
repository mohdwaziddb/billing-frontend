import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export const Button = ({ children, className, variant = "primary", ...props }: ButtonProps) => {
  return (
    <button
      className={clsx(
        "relative inline-flex min-h-10 items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-control)] border px-4 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--theme-color)_35%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" &&
          "border-transparent bg-[var(--theme-color)] text-[var(--theme-contrast)] shadow-[0_10px_24px_color-mix(in_srgb,var(--theme-color)_24%,transparent)] hover:-translate-y-0.5 hover:bg-[var(--theme-hover)]",
        variant === "secondary" &&
          "border-[color:color-mix(in_srgb,var(--theme-color)_26%,#d8e0ec)] bg-white text-[var(--theme-dark)] hover:-translate-y-0.5 hover:bg-[color-mix(in_srgb,var(--theme-color)_7%,white)]",
        variant === "ghost" &&
          "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950",
        variant === "danger" &&
          "border-rose-200 bg-rose-50 text-rose-700 hover:-translate-y-0.5 hover:bg-rose-100",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

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
        "relative inline-flex min-h-11 items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-control)] border px-4 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" &&
          "neon-border border-[color:color-mix(in_srgb,var(--theme-border)_42%,transparent)] bg-[linear-gradient(90deg,var(--theme-color),var(--theme-hover))] text-slate-950 shadow-[0_16px_40px_color-mix(in_srgb,var(--theme-color)_24%,transparent)] hover:-translate-y-0.5",
        variant === "secondary" &&
          "border-white/10 bg-white/8 text-white hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/12",
        variant === "ghost" &&
          "border-transparent bg-transparent text-slate-300 hover:border-white/10 hover:bg-white/6 hover:text-white",
        variant === "danger" &&
          "border-rose-300/20 bg-rose-500/12 text-rose-100 hover:-translate-y-0.5 hover:bg-rose-500/18",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

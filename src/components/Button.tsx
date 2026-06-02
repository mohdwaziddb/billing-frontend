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
        "neon-border relative overflow-hidden rounded-2xl px-5 py-3 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-gradient-to-r from-cyan-400/30 to-emerald-300/20 text-white border border-white/15",
        variant === "secondary" && "bg-white/10 text-white border border-white/10 hover:bg-white/15",
        variant === "ghost" && "bg-transparent text-slate-300 border border-white/10 hover:bg-white/5 hover:text-white",
        variant === "danger" && "bg-rose-400/15 text-rose-200 border border-rose-300/20 hover:bg-rose-400/20",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

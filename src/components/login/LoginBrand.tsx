import { BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

export const LoginBrand = ({ className = "" }: { className?: string }) => (
  <Link
    to="/"
    aria-label="Bizio Technologies - go to homepage"
    className={`group inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(36,83,216,0.45)] ${className}`}
  >
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#1f4ed8,#2b5dff)] text-white shadow-[0_8px_18px_rgba(36,83,216,0.28)] transition duration-200 group-hover:-translate-y-0.5">
      <BarChart3 size={18} />
    </span>
    <span className="text-lg font-extrabold tracking-[-0.04em]">
      <span className="text-[#2453d8]">Bizio</span>
      <span className="text-slate-900"> Technologies</span>
    </span>
  </Link>
);
import { Building2, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "../../lib/framerMotionCompat";

const navItems = [
  ["#features", "Platform"],
  ["#solutions", "Solutions"],
  ["#showcase", "Product"],
  ["#security", "Security"],
  ["#contact", "Contact"]
] as const;

export const LandingNavbar = ({
  productName,
  platformLogoUrl
}: {
  productName: string;
  platformLogoUrl: string | null;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-white/78 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,246,255,0.98))] shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
            {platformLogoUrl ? (
              <img src={platformLogoUrl} alt={productName} className="h-full w-full object-contain p-2.5" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1f4ed8,#67e8f9)] text-white shadow-[0_14px_28px_rgba(31,78,216,0.26)]">
                <Building2 size={20} />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[1.2rem] font-black tracking-[-0.04em] text-slate-950">{productName}</p>
            <p className="truncate text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Finance operating platform</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navItems.map(([href, label]) => (
            <a key={href} href={href} className="text-sm font-bold text-slate-600 transition hover:text-slate-950">
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          >
            Login
          </Link>
          <a
            href="#contact"
            className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#1f4ed8,#2563eb,#67e8f9)] px-5 py-2.5 text-sm font-black text-white shadow-[0_18px_36px_rgba(37,99,235,0.24)]"
          >
            Book a walkthrough
          </a>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 lg:hidden"
          onClick={() => setOpen((current) => !current)}
          aria-label="Toggle navigation"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <motion.div
        className="lg:hidden"
        initial={undefined}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.28 }}
        style={{ overflow: "hidden" }}
      >
        <div className="mx-4 mb-4 rounded-[28px] border border-white/80 bg-white/92 p-4 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
          <div className="grid gap-3">
            {navItems.map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                onClick={() => setOpen(false)}
              >
                {label}
              </a>
            ))}
            <Link to="/login" className="rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-700">
              Login
            </Link>
          </div>
        </div>
      </motion.div>
    </header>
  );
};

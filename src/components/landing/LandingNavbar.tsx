import { Building2 } from "lucide-react";
import { Link } from "react-router-dom";

export const LandingNavbar = ({
  productName,
  platformLogoUrl
}: {
  productName: string;
  platformLogoUrl: string | null;
}) => (
  <header className="sticky top-0 z-40 border-b border-white/70 bg-white/70 backdrop-blur-2xl">
    <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
      <Link to="/" className="flex min-w-0 items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/80">
          {platformLogoUrl ? (
            <img src={platformLogoUrl} alt={productName} className="h-full w-full object-contain p-2.5" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563EB,#06B6D4)] text-white shadow-[0_12px_28px_rgba(37,99,235,0.24)]">
              <Building2 size={20} />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[1.25rem] font-black tracking-[-0.04em] text-slate-950">{productName}</p>
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
            BizFinity Technologies Pvt. Ltd.
          </p>
        </div>
      </Link>

      <nav className="hidden items-center gap-8 lg:flex">
        {[
          ["#features", "Features"],
          ["#solutions", "Solutions"],
          ["#pricing", "Pricing (Coming Soon)"],
          ["#contact", "Contact"]
        ].map(([href, label]) => (
          <a key={href} href={href} className="text-sm font-bold text-slate-600 transition hover:text-slate-950">
            {label}
          </a>
        ))}
      </nav>
    </div>
  </header>
);

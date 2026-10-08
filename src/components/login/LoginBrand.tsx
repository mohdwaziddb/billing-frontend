import { BarChart3, Building2 } from "lucide-react";
import { env } from "../../config/env";
import { mainSiteHomeUrl } from "../../lib/hosts";

export type LoginBrandCompany = {
  name?: string | null;
  logoUrl?: string | null;
} | null;

type LoginBrandProps = {
  className?: string;
  company?: LoginBrandCompany;
};

export const LoginBrand = ({ className = "", company = null }: LoginBrandProps) => {
  const apiOrigin = env.apiBaseUrl.replace(/\/api\/?$/, "");
  const logoUrl =
    company?.logoUrl != null && company.logoUrl !== ""
      ? company.logoUrl.startsWith("http")
        ? company.logoUrl
        : `${apiOrigin}${company.logoUrl}`
      : null;

  // Rule: logo ho to logo (+ naam), warna company ka naam, warna Bizio fallback.
  // Brand hamesha main site (landing) pe le jata hai — tenant login page pe
  // "/" ka koi matlab nahi (wahi page wapas khulega).
  const homeUrl = mainSiteHomeUrl();
  if (logoUrl) {
    return (
      <a
        href={homeUrl}
        aria-label={`${company?.name ?? "Company"} - go to homepage`}
        className={`group inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(36,83,216,0.45)] ${className}`}
      >
        <img
          src={logoUrl}
          alt={`${company?.name ?? "Company"} logo`}
          className="h-10 w-10 rounded-xl border border-slate-200 bg-white object-contain shadow-[0_8px_18px_rgba(36,83,216,0.18)]"
        />
        <span className="truncate text-lg font-extrabold tracking-[-0.04em] text-slate-900">{company?.name}</span>
      </a>
    );
  }

  if (company?.name) {
    return (
      <a
        href={homeUrl}
        aria-label={`${company.name} - go to homepage`}
        className={`group inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(36,83,216,0.45)] ${className}`}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#1f4ed8,#2b5dff)] text-white shadow-[0_8px_18px_rgba(36,83,216,0.28)] transition duration-200 group-hover:-translate-y-0.5">
          <Building2 size={18} />
        </span>
        <span className="truncate text-lg font-extrabold tracking-[-0.04em] text-slate-900">{company.name}</span>
      </a>
    );
  }

  return (
    <a
      href={homeUrl}
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
    </a>
  );
};
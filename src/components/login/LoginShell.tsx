import { BarChart3, Building2 } from "lucide-react";
import { type ReactNode } from "react";
import { resolveAssetUrl } from "../../config/env";
import { PUBLIC_APP_TITLE } from "../../config/site";
import { useAuth } from "../../context/AuthContext";
import { AnalyticsShowcase } from "./AnalyticsShowcase";

export type LoginShellCompany = {
  name?: string | null;
  logoUrl?: string | null;
} | null;

type LoginShellProps = {
  company?: LoginShellCompany;
  brandingReady?: boolean;
  footerNote?: ReactNode;
  children: ReactNode;
};

/**
 * Common auth-page shell (tenant login + platform admin login): soft warm
 * page gradient, ek bada white rounded card — left me brand + analytics
 * showcase panel (AnalyticsShowcase), right me form pane. Har login page
 * yahi shell use karta hai.
 */
export const LoginShell = ({ company = null, brandingReady = true, footerNote, children }: LoginShellProps) => {
  const { platform } = useAuth();
  const platformName = platform.platformName?.trim() || PUBLIC_APP_TITLE;
  const platformLogoUrl = resolveAssetUrl(platform.platformLogo);
  const companyLogoUrl = resolveAssetUrl(company?.logoUrl);

  // Header row: tenant branding mile to wahi, warna platform branding
  // (platform-admin login) — dono pages ka ek hi look.
  const header =
    !brandingReady && !company?.name ? (
      <div className="flex items-center gap-3" aria-label="Loading workspace">
        <span className="h-12 w-12 animate-pulse rounded-full bg-slate-200" />
        <span className="h-5 w-48 animate-pulse rounded-lg bg-slate-200" />
      </div>
    ) : company?.name ? (
      <div className="flex items-center gap-3">
        {companyLogoUrl ? (
          <img
            src={companyLogoUrl}
            alt={`${company.name} logo`}
            className="h-12 w-12 shrink-0 rounded-full border border-slate-200 bg-white object-contain"
          />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-color)_12%,white)] text-[var(--theme-color)]">
            <Building2 size={22} />
          </span>
        )}
        <p className="truncate text-[17px] font-extrabold tracking-[-0.02em] text-slate-900">{company.name}</p>
      </div>
    ) : (
      <div className="flex items-center gap-3">
        {platformLogoUrl ? (
          <img
            src={platformLogoUrl}
            alt={platformName}
            className="h-12 w-12 shrink-0 rounded-full border border-slate-200 bg-white object-contain"
          />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[image:var(--theme-gradient)] text-[var(--theme-contrast)]">
            <BarChart3 size={22} />
          </span>
        )}
        <p className="truncate text-[17px] font-extrabold tracking-[-0.02em] text-slate-900">{platformName}</p>
      </div>
    );

  return (
    <div
      className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[linear-gradient(140deg,#f7f4f2_0%,#eef0f5_50%,#f5f2f0_100%)]"
      style={{ fontFamily: "Manrope, Inter, system-ui, sans-serif" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-28 h-[420px] w-[420px] rounded-full opacity-70 blur-2xl"
        style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--theme-accent) 20%, white) 0%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-28 bottom-[-90px] h-[400px] w-[400px] rounded-full opacity-60 blur-2xl"
        style={{ background: "radial-gradient(circle, #e6edfb 0%, transparent 70%)" }}
      />

      {/* lg:py-4: 1366x768 laptop par card + footer bina scroll ke ek screen me. */}
      <div className="relative z-10 flex w-full flex-1 items-center justify-center px-3 py-4 sm:px-6 sm:py-8 lg:py-4">
        <div className="w-full max-w-[1180px] rounded-[26px] bg-white p-2.5 shadow-[0_40px_100px_rgba(15,23,42,0.10)] ring-1 ring-slate-900/5 sm:p-3">
          <div className="grid lg:grid-cols-2">
            <AnalyticsShowcase />

            <section className="flex flex-col justify-center px-5 py-8 sm:px-10 lg:px-14 lg:py-12">
              {header}
              <div className="mt-8 w-full max-w-[520px]">{children}</div>
            </section>
          </div>
        </div>
      </div>

      <p className="relative z-10 pb-4 pt-1 text-center text-[11px] font-medium text-slate-400">
        {footerNote ?? "© 2026 Bizio Technologies. All rights reserved."}
      </p>
    </div>
  );
};

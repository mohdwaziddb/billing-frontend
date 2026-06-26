import { lazy, Suspense, useEffect, useState } from "react";
import { defaultPlatformSettings, getPlatformSettings } from "../api/platform";
import { HeroSection } from "../components/landing/HeroSection";
import { LandingNavbar } from "../components/landing/LandingNavbar";
import { TrustSection } from "../components/landing/TrustSection";
import { env } from "../config/env";
import type { PlatformSettings } from "../types/api";

const FeatureSection = lazy(async () => import("../components/landing/FeatureSection").then((module) => ({ default: module.FeatureSection })));
const WhyBizFinitySection = lazy(async () => import("../components/landing/WhyBizFinitySection").then((module) => ({ default: module.WhyBizFinitySection })));
const ProductShowcaseSection = lazy(async () => import("../components/landing/ProductShowcaseSection").then((module) => ({ default: module.ProductShowcaseSection })));
const WorkflowSection = lazy(async () => import("../components/landing/WorkflowSection").then((module) => ({ default: module.WorkflowSection })));
const AISection = lazy(async () => import("../components/landing/AISection").then((module) => ({ default: module.AISection })));
const SecuritySection = lazy(async () => import("../components/landing/SecuritySection").then((module) => ({ default: module.SecuritySection })));
const TestimonialSection = lazy(async () => import("../components/landing/TestimonialSection").then((module) => ({ default: module.TestimonialSection })));
const FaqSection = lazy(async () => import("../components/landing/FaqSection").then((module) => ({ default: module.FaqSection })));
const ContactSection = lazy(async () => import("../components/landing/ContactSection").then((module) => ({ default: module.ContactSection })));
const LandingFooter = lazy(async () => import("../components/landing/LandingFooter").then((module) => ({ default: module.LandingFooter })));

const HOME_PAGE_TITLE = "BizFinity Technologies Pvt. Ltd.";

export const LandingPage = () => {
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(defaultPlatformSettings);

  useEffect(() => {
    void getPlatformSettings()
      .then(setPlatformSettings)
      .catch(() => setPlatformSettings(defaultPlatformSettings));
  }, []);

  useEffect(() => {
    document.title = HOME_PAGE_TITLE;
  }, []);

  const productName = platformSettings.platformName?.trim() || "BizFinity";
  const apiOrigin = env.apiBaseUrl.replace(/\/api\/?$/, "");
  const platformLogoUrl = platformSettings.platformLogo
    ? (platformSettings.platformLogo.startsWith("http") ? platformSettings.platformLogo : `${apiOrigin}${platformSettings.platformLogo}`)
    : null;

  return (
    <div
      className="landing-page-theme min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_28%,#f8faff_58%,#ffffff_100%)] text-slate-950"
      style={{ fontFamily: "Manrope, Inter, Space Grotesk, system-ui, sans-serif" }}
    >
      <style>{`
        @keyframes landing-float {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -10px, 0); }
        }
        @keyframes landing-pan {
          0% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(10px, -12px, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-[52rem] bg-[radial-gradient(circle_at_10%_8%,rgba(37,99,235,0.16),transparent_24%),radial-gradient(circle_at_85%_12%,rgba(6,182,212,0.14),transparent_24%),radial-gradient(circle_at_55%_18%,rgba(139,92,246,0.10),transparent_20%)]" style={{ animation: "landing-pan 16s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute right-[-8%] top-[16rem] h-[24rem] w-[24rem] rounded-full bg-cyan-100/80 blur-3xl" />
      <div className="pointer-events-none absolute left-[-8%] top-[56rem] h-[20rem] w-[20rem] rounded-full bg-blue-100/80 blur-3xl" />

      <LandingNavbar productName={productName} platformLogoUrl={platformLogoUrl} />

      <main className="relative">
        <HeroSection />
        <TrustSection />

        <Suspense fallback={<LandingSectionFallback />}>
          <FeatureSection />
          <WhyBizFinitySection />
          <PricingSoonSection />
          <ProductShowcaseSection />
          <WorkflowSection />
          <AISection />
          <SecuritySection />
          <TestimonialSection />
          <FaqSection />
          <ContactSection />
          <LandingFooter />
        </Suspense>
      </main>
    </div>
  );
};

const PricingSoonSection = () => (
  <section id="pricing" className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6">
    <div className="overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,rgba(37,99,235,0.12),rgba(6,182,212,0.10),rgba(139,92,246,0.10))] p-[1px] shadow-[0_28px_70px_rgba(15,23,42,0.08)]">
      <div className="rounded-[35px] bg-white px-7 py-8 md:px-10">
        <p className="text-sm font-black uppercase tracking-[0.34em] text-[#2563EB]">Pricing</p>
        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-4xl font-black tracking-[-0.05em] text-slate-950 md:text-5xl">Pricing plans are being shaped for serious business usage</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              BizFinity pricing is planned to align with operational scale, business needs, and premium product value. Public pricing will be announced soon.
            </p>
          </div>
          <div className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white">
            Coming Soon
          </div>
        </div>
      </div>
    </div>
  </section>
);

const LandingSectionFallback = () => <div className="h-6" />;

import {
  ArrowRight,
  BarChart3,
  Boxes,
  CreditCard,
  FileText,
  LayoutDashboard,
  PackageSearch,
  ReceiptIndianRupee,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Users,
  Wallet
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPlatformSettings, defaultPlatformSettings } from "../api/platform";
import { Button } from "../components/Button";
import { env } from "../config/env";
import type { PlatformSettings } from "../types/api";

const features = [
  {
    title: "Smart Billing",
    description: "Generate invoices quickly and accurately with fast workflows built for everyday business billing.",
    icon: FileText
  },
  {
    title: "Inventory Management",
    description: "Track stock, low inventory, and product movement without depending on separate tools.",
    icon: Boxes
  },
  {
    title: "Customer Management",
    description: "Manage customers, balances, and purchase history from one operational workspace.",
    icon: Users
  },
  {
    title: "Expense Tracking",
    description: "Monitor spending, control outflow, and understand profitability with better visibility.",
    icon: ReceiptIndianRupee
  },
  {
    title: "Payment Tracking",
    description: "Track received, pending, and overdue payments with clear status and follow-up readiness.",
    icon: CreditCard
  },
  {
    title: "Business Analytics",
    description: "Turn daily transactions into business insights using practical analytics and reports.",
    icon: BarChart3
  }
];

const benefits = [
  { title: "Secure Platform", description: "Protected access, isolated tenant data, and trusted business controls.", icon: ShieldCheck },
  { title: "Multi-Tenant Architecture", description: "Built to support many companies cleanly from one core system.", icon: LayoutDashboard },
  { title: "Fast Performance", description: "Designed to keep billing and operations quick during busy business hours.", icon: TrendingUp },
  { title: "Mobile Friendly", description: "Comfortable experience across desktop, tablet, and mobile devices.", icon: Smartphone },
  { title: "Role Based Access", description: "Manage business permissions for teams without compromising control.", icon: Users },
  { title: "Real-Time Reporting", description: "Stay current on sales, inventory, expenses, and receivables instantly.", icon: PackageSearch }
];

const previews = [
  { title: "Dashboard", accent: "from-sky-500/18 via-white/70 to-cyan-500/12" },
  { title: "Invoice Management", accent: "from-emerald-500/18 via-white/70 to-sky-500/10" },
  { title: "Inventory", accent: "from-amber-500/18 via-white/70 to-orange-500/10" },
  { title: "Expenses", accent: "from-rose-500/18 via-white/70 to-orange-500/10" },
  { title: "Analytics", accent: "from-indigo-500/18 via-white/70 to-sky-500/10" }
];

const testimonials = [
  {
    quote: "We moved daily billing, stock checks, and customer dues into one reliable system.",
    name: "Rohit Sharma",
    role: "Retail Store Owner"
  },
  {
    quote: "The workflow is clean, fast, and practical for our team across invoicing and inventory updates.",
    name: "Shabnam Khan",
    role: "Distributor"
  },
  {
    quote: "It feels like business software designed for real operations rather than generic administration.",
    name: "Amit Verma",
    role: "Service Business Manager"
  }
];

const stats = [
  { label: "Companies Managed", value: "250+" },
  { label: "Invoices Generated", value: "1.2M+" },
  { label: "Products Managed", value: "85K+" },
  { label: "Payments Processed", value: "480K+" }
];

export const LandingPage = () => {
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(defaultPlatformSettings);

  useEffect(() => {
    void getPlatformSettings()
      .then(setPlatformSettings)
      .catch(() => setPlatformSettings(defaultPlatformSettings));
  }, []);

  const productName = platformSettings.platformName?.trim() || "Wazid Billing";
  const productTagline = platformSettings.platformTagline?.trim() || "A complete business management platform for billing, stock, payments, expenses and analytics.";
  const brandEyebrow = platformSettings.platformTagline?.trim() || "Business Platform";
  const apiOrigin = env.apiBaseUrl.replace(/\/api\/?$/, "");
  const platformLogoUrl = platformSettings.platformLogo
    ? (platformSettings.platformLogo.startsWith("http") ? platformSettings.platformLogo : `${apiOrigin}${platformSettings.platformLogo}`)
    : null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.16),transparent_22%),linear-gradient(180deg,color-mix(in_srgb,var(--panel-soft)_82%,white),var(--app-bg))] text-[var(--text-primary)] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_22%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.12),transparent_20%),linear-gradient(180deg,#07111f,#0f172a)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[linear-gradient(180deg,rgba(255,255,255,0.16),transparent)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]" />

      <header className="sticky top-0 z-40 border-b border-white/25 bg-white/55 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/35">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-white/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(255,255,255,0.4))] shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.82),rgba(15,23,42,0.48))]">
              {platformLogoUrl ? (
                <img src={platformLogoUrl} alt={productName} className="h-full w-full object-contain p-2" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--theme-dark),var(--theme-color))] text-white shadow-[0_12px_24px_color-mix(in_srgb,var(--theme-color)_22%,transparent)]">
                  <Wallet size={20} />
                </div>
              )}
            </div>
            <div className="min-w-0 self-center">
              <p className="bg-[linear-gradient(135deg,var(--text-primary),color-mix(in_srgb,var(--theme-color)_65%,var(--text-primary)))] bg-clip-text text-[1.2rem] font-black tracking-[-0.03em] text-transparent sm:text-[1.35rem]">
                {productName}
              </p>
              <p className="max-w-[360px] text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)] sm:text-[11.5px]">
                {brandEyebrow}
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            <a href="#features" className="text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]">Features</a>
            <a href="#pricing" className="text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]">Pricing</a>
            <a href="#contact" className="text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]">Contact</a>
          </nav>

          <Link to="/login">
            <Button className="px-5">Login</Button>
          </Link>
        </div>
      </header>

      <main className="relative">
        <section className="mx-auto grid w-full max-w-7xl gap-14 px-4 py-16 md:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-24">
          <div>
            <div className="inline-flex rounded-full border border-white/40 bg-white/60 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-[var(--theme-dark)] shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-sky-200">
              Professional SaaS Billing Platform
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-extrabold leading-[1.03] tracking-tight text-[var(--text-primary)] md:text-6xl">
              Manage Billing, Inventory, Expenses & Payments from One Place
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--text-secondary)]">
              {productTagline}
            </p>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
              A complete business management platform to handle invoicing, inventory, customers, expenses, payments and business analytics.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/login">
                <Button className="w-full px-6 sm:w-auto">
                  Login <ArrowRight size={16} />
                </Button>
              </Link>
              <a href="#features" className="sm:w-auto">
                <Button className="w-full border-white/40 bg-white/70 px-6 backdrop-blur-xl dark:bg-white/8" variant="secondary">
                  View Features
                </Button>
              </a>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                "Built for retailers, SMEs and distributors",
                "Fast daily billing and stock operations",
                "Business visibility with practical reporting"
              ].map((item) => (
                <div key={item} className="rounded-[24px] border border-white/40 bg-white/55 px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                  <p className="text-sm font-semibold leading-6 text-[var(--text-secondary)]">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-10 top-6 h-40 w-40 rounded-full bg-sky-400/22 blur-3xl dark:bg-sky-500/18" />
            <div className="absolute -right-6 bottom-8 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl dark:bg-cyan-500/16" />

            <div className="relative overflow-hidden rounded-[34px] border border-white/45 bg-white/42 p-5 shadow-[0_36px_90px_rgba(15,23,42,0.14)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
              <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[28px] border border-white/45 bg-white/78 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">Overview</p>
                      <h3 className="mt-2 text-xl font-extrabold text-[var(--text-primary)]">Business Dashboard</h3>
                    </div>
                    <div className="rounded-2xl border border-white/40 bg-[color:color-mix(in_srgb,var(--theme-color)_14%,white)] px-3 py-2 text-sm font-bold text-[var(--theme-dark)] dark:border-white/10 dark:bg-[color:color-mix(in_srgb,var(--theme-color)_22%,#0f172a)] dark:text-sky-200">
                      Live
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {[
                      { label: "Sales", value: "Rs. 8.4L" },
                      { label: "Receivables", value: "Rs. 1.2L" },
                      { label: "Inventory", value: "12,480" }
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-2xl border border-white/40 bg-white/72 px-4 py-4 backdrop-blur-lg dark:border-white/10 dark:bg-white/5">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{stat.label}</p>
                        <p className="mt-2 text-2xl font-extrabold text-[var(--text-primary)]">{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-[24px] border border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.68),rgba(255,255,255,0.46))] p-4 backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.66),rgba(15,23,42,0.36))]">
                    <div className="flex items-end gap-3">
                      {[62, 48, 75, 58, 84, 72, 91].map((height, index) => (
                        <div key={index} className="flex-1">
                          <div className="rounded-t-2xl bg-[linear-gradient(180deg,var(--theme-light),var(--theme-color))] shadow-[0_10px_24px_color-mix(in_srgb,var(--theme-color)_18%,transparent)]" style={{ height }} />
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex justify-between text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                      <span>Sun</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[28px] border border-white/45 bg-white/78 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">Invoice Preview</p>
                    <div className="mt-4 space-y-3">
                      {["Invoice #INV-2184", "Customer: Sharma Traders", "Status: Paid", "Amount: Rs. 18,450"].map((item) => (
                        <div key={item} className="rounded-2xl border border-white/35 bg-white/70 px-3 py-3 text-sm font-semibold text-[var(--text-secondary)] backdrop-blur-lg dark:border-white/10 dark:bg-white/5">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-white/45 bg-white/78 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">Collections</p>
                    <div className="mt-4 space-y-3">
                      {[
                        { name: "Received", amount: "Rs. 3.6L", tone: "bg-emerald-500" },
                        { name: "Pending", amount: "Rs. 92K", tone: "bg-amber-500" },
                        { name: "Overdue", amount: "Rs. 31K", tone: "bg-rose-500" }
                      ].map((item) => (
                        <div key={item.name} className="flex items-center justify-between rounded-2xl border border-white/35 bg-white/70 px-3 py-3 backdrop-blur-lg dark:border-white/10 dark:bg-white/5">
                          <div className="flex items-center gap-3">
                            <span className={`h-3 w-3 rounded-full ${item.tone}`} />
                            <span className="text-sm font-semibold text-[var(--text-secondary)]">{item.name}</span>
                          </div>
                          <span className="text-sm font-extrabold text-[var(--text-primary)]">{item.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6" id="features">
          <SectionHeading
            eyebrow="Features"
            title="Everything your business needs to operate smoothly"
            description="Purpose-built tools for billing, stock, customer tracking, expenses, collections and business visibility."
          />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map(({ title, description, icon: Icon }) => (
              <div key={title} className="rounded-[30px] border border-white/40 bg-white/55 p-6 shadow-[0_20px_48px_rgba(15,23,42,0.08)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_56px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-white/5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/35 bg-white/70 text-[var(--theme-dark)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-sky-200">
                  <Icon size={24} />
                </div>
                <h3 className="mt-5 text-2xl font-extrabold text-[var(--text-primary)]">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-[28px] border border-white/40 bg-white/58 p-6 shadow-[0_20px_48px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">{stat.label}</p>
                <p className="mt-4 text-4xl font-extrabold text-[var(--text-primary)]">{stat.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6">
          <SectionHeading
            eyebrow="Why Choose Us"
            title="Designed for business reliability and scale"
          />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {benefits.map(({ title, description, icon: Icon }) => (
              <div key={title} className="rounded-[30px] border border-white/40 bg-white/55 p-6 shadow-[0_20px_48px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/35 bg-white/72 text-[var(--theme-dark)] backdrop-blur-lg dark:border-white/10 dark:bg-white/5 dark:text-sky-200">
                    <Icon size={22} />
                  </div>
                  <h3 className="text-xl font-extrabold text-[var(--text-primary)]">{title}</h3>
                </div>
                <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.34em] text-[var(--theme-color)]">Application Preview</p>
              <h2 className="mt-4 text-4xl font-extrabold text-[var(--text-primary)]">A product experience built for daily operations</h2>
            </div>
            <Link to="/login">
              <Button className="border-white/35 bg-white/72 backdrop-blur-xl dark:bg-white/8" variant="secondary">Login to Explore</Button>
            </Link>
          </div>
          <div className="grid gap-5 lg:grid-cols-5">
            {previews.map((preview, index) => (
              <div key={preview.title} className={`overflow-hidden rounded-[28px] border border-white/40 bg-white/55 p-4 shadow-[0_20px_48px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 ${index === 0 ? "lg:col-span-2 lg:row-span-2" : ""}`}>
                <div className={`rounded-[22px] border border-white/40 bg-gradient-to-br ${preview.accent} p-4 dark:border-white/10`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-[var(--text-primary)]">{preview.title}</p>
                    <span className="rounded-full border border-white/35 bg-white/72 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--text-tertiary)] backdrop-blur-lg dark:border-white/10 dark:bg-white/8">Preview</span>
                  </div>
                  <div className={`mt-4 grid gap-3 ${index === 0 ? "sm:grid-cols-2" : ""}`}>
                    <div className="rounded-2xl border border-white/30 bg-white/78 p-4 backdrop-blur-lg dark:border-white/10 dark:bg-white/8">
                      <div className="h-3 w-24 rounded-full bg-slate-200 dark:bg-slate-700" />
                      <div className="mt-3 space-y-2">
                        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700" />
                        <div className="h-2 w-4/5 rounded-full bg-slate-200 dark:bg-slate-700" />
                        <div className="h-2 w-3/5 rounded-full bg-slate-200 dark:bg-slate-700" />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/30 bg-white/78 p-4 backdrop-blur-lg dark:border-white/10 dark:bg-white/8">
                      <div className="flex items-end gap-2">
                        {[48, 64, 56, 82].map((height) => (
                          <div key={height} className="flex-1 rounded-t-2xl bg-[linear-gradient(180deg,var(--theme-light),var(--theme-color))]" style={{ height }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6" id="pricing">
          <div className="rounded-[34px] border border-white/18 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--theme-dark)_88%,#081321),color-mix(in_srgb,var(--theme-color)_70%,#164e63))] p-8 text-white shadow-[0_28px_80px_rgba(15,23,42,0.16)] backdrop-blur-2xl md:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm font-bold uppercase tracking-[0.34em] text-cyan-100">Pricing</p>
                <h2 className="mt-4 text-4xl font-extrabold">Flexible plans for growing businesses</h2>
                <p className="mt-4 text-base leading-7 text-white/80">
                  Pricing can be tailored based on company size, feature needs, and business scale. Contact us for a custom plan.
                </p>
              </div>
              <Link to="/login">
                <Button className="bg-white text-slate-950 hover:bg-slate-100 hover:text-slate-950">Login</Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6">
          <SectionHeading
            eyebrow="Testimonials"
            title="Trusted by real businesses"
          />
          <div className="grid gap-5 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} className="rounded-[30px] border border-white/40 bg-white/55 p-6 shadow-[0_20px_48px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
                <p className="text-base leading-8 text-[var(--text-secondary)]">"{testimonial.quote}"</p>
                <div className="mt-6">
                  <p className="text-lg font-extrabold text-[var(--text-primary)]">{testimonial.name}</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--text-tertiary)]">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-12 md:px-6" id="contact">
          <div className="grid gap-6 rounded-[34px] border border-white/40 bg-white/55 p-8 shadow-[0_20px_48px_rgba(15,23,42,0.08)] backdrop-blur-2xl lg:grid-cols-[1.1fr_0.9fr] lg:items-center dark:border-white/10 dark:bg-white/5">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.34em] text-[var(--theme-color)]">Contact</p>
              <h2 className="mt-4 text-4xl font-extrabold text-[var(--text-primary)]">Talk to our team</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
                Whether you run a retail shop, distribution network, or service business, we can help you standardize daily operations.
              </p>
            </div>
            <div className="grid gap-4">
              {[
                { label: "Email", value: "support@wazidbilling.com" },
                { label: "Phone", value: "+91 81307 03196" },
                { label: "Support", value: "Monday to Saturday, 9:00 AM to 7:00 PM" }
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/35 bg-white/72 px-5 py-4 backdrop-blur-lg dark:border-white/10 dark:bg-white/8">
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">{item.label}</p>
                  <p className="mt-2 text-lg font-bold text-[var(--text-primary)]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/30 bg-white/45 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/25">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 text-sm text-[var(--text-secondary)] md:flex-row md:items-center md:justify-between md:px-6">
          <p>© 2026 {productName}. Professional business management software.</p>
          <div className="flex flex-wrap gap-5">
            <a href="#top" className="font-semibold transition hover:text-[var(--text-primary)]">About</a>
            <a href="#features" className="font-semibold transition hover:text-[var(--text-primary)]">Features</a>
            <a href="#contact" className="font-semibold transition hover:text-[var(--text-primary)]">Contact</a>
            <a href="#privacy" className="font-semibold transition hover:text-[var(--text-primary)]">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const SectionHeading = ({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) => (
  <div className="mb-10 text-center">
    <p className="text-sm font-bold uppercase tracking-[0.34em] text-[var(--theme-color)]">{eyebrow}</p>
    <h2 className="mt-4 text-4xl font-extrabold text-[var(--text-primary)]">{title}</h2>
    {description ? <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-[var(--text-secondary)]">{description}</p> : null}
  </div>
);

import { Linkedin, Mail, Twitter } from "lucide-react";

export const LandingFooter = () => (
  <footer className="border-t border-white/70 bg-white/84 backdrop-blur-2xl">
    <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 md:px-6 lg:grid-cols-[1.1fr_0.8fr_1fr]">
      <div>
        <p className="text-xl font-black tracking-[-0.04em] text-slate-950">BizFinity</p>
        <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
          A premium billing and finance operations experience for teams that want structure, speed, and a stronger commercial command layer.
        </p>
      </div>

      <div className="grid gap-3">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">Navigate</p>
        <a href="#features" className="text-sm font-bold text-slate-600 transition hover:text-slate-950">Platform</a>
        <a href="#solutions" className="text-sm font-bold text-slate-600 transition hover:text-slate-950">Solutions</a>
        <a href="#security" className="text-sm font-bold text-slate-600 transition hover:text-slate-950">Security</a>
        <a href="#contact" className="text-sm font-bold text-slate-600 transition hover:text-slate-950">Contact</a>
      </div>

      <div className="grid gap-4">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">Connect</p>
        <div className="flex gap-3">
          {[Linkedin, Twitter, Mail].map((Icon, index) => (
            <a
              key={index}
              href={index === 2 ? "mailto:hello@bizfinity.in" : "#contact"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-950"
            >
              <Icon size={18} />
            </a>
          ))}
        </div>
      </div>
    </div>

    <div className="border-t border-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-5 text-sm text-slate-500 md:flex-row md:items-center md:justify-between md:px-6">
        <p>&copy; 2026 BizFinity. All rights reserved.</p>
        <p>Landing page redesign with preserved `/login` access.</p>
      </div>
    </div>
  </footer>
);

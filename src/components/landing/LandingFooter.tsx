import { Instagram, Linkedin, Twitter } from "lucide-react";

export const LandingFooter = () => (
  <footer className="border-t border-white/70 bg-white/80 backdrop-blur-2xl">
    <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 md:px-6 lg:grid-cols-[1.15fr_0.9fr_0.9fr]">
      <div>
        <p className="text-lg font-black tracking-[-0.03em] text-slate-950">BizFinity Technologies Pvt. Ltd.</p>
        <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
          A premium SaaS foundation for billing, inventory, communication, reporting, and modern business operations.
        </p>
      </div>

      <div className="grid gap-3">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">Links</p>
        <a href="#solutions" className="text-sm font-bold text-slate-600 transition hover:text-slate-950">About</a>
        <a href="#privacy" className="text-sm font-bold text-slate-600 transition hover:text-slate-950">Privacy</a>
        <a href="#terms" className="text-sm font-bold text-slate-600 transition hover:text-slate-950">Terms</a>
        <a href="#contact" className="text-sm font-bold text-slate-600 transition hover:text-slate-950">Support</a>
      </div>

      <div className="grid gap-4">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">Social</p>
        <div className="flex gap-3">
          {[Linkedin, Twitter, Instagram].map((Icon, index) => (
            <a
              key={index}
              href="#social"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-slate-950"
            >
              <Icon size={18} />
            </a>
          ))}
        </div>
      </div>
    </div>

    <div className="border-t border-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-5 text-sm text-slate-500 md:flex-row md:items-center md:justify-between md:px-6">
        <p>&copy; 2026 BizFinity Technologies Pvt. Ltd. All rights reserved.</p>
        <p>Public Home Page only. Login remains available on `/login`.</p>
      </div>
    </div>
  </footer>
);

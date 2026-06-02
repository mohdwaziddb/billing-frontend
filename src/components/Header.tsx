import { Search, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Input } from "./Input";

export const Header = ({ title, subtitle }: { title: string; subtitle: string }) => {
  const { user } = useAuth();

  return (
    <header className="glass sticky top-4 z-30 overflow-hidden rounded-3xl p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">Premium billing SaaS</p>
          <h1 className="mt-2 text-3xl font-extrabold text-white">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300/70">{subtitle}</p>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              placeholder="Quick Search"
              type="search"
              className="h-12 rounded-2xl border-white/10 bg-slate-950/85 pl-11 pr-4"
            />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-left lg:text-right">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Signed in</p>
            <p className="mt-1 text-sm font-semibold text-white">{user?.fullName}</p>
            <p className="text-xs text-slate-300/65">{user?.company?.name ?? "Platform"}</p>
          </div>
          <div className="hidden rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-cyan-100 sm:block">
            <Sparkles size={18} />
          </div>
        </div>
      </div>
    </header>
  );
};

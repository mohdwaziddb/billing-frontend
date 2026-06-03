import { Building2, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Header = ({ title, subtitle }: { title: string; subtitle: string }) => {
  const { user } = useAuth();

  return (
    <header className="glass overflow-hidden rounded-[var(--radius-panel)] p-5 md:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-sky-200/70">Billing operations</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white md:text-[2rem]">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300/75">{subtitle}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:w-[360px]">
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-sky-400/10 p-2.5 text-sky-100">
                <ShieldCheck size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Signed in</p>
                <p className="truncate text-sm font-semibold text-white">{user?.fullName ?? "User"}</p>
              </div>
            </div>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/8 p-2.5 text-slate-200">
                <Building2 size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Workspace</p>
                <p className="truncate text-sm font-semibold text-white">{user?.company?.name ?? "Platform access"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

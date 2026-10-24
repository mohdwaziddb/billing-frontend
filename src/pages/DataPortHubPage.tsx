import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileSpreadsheet, Loader2, Lock } from "lucide-react";
import { getDataPortModules } from "../api/dataPorts";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { resolveMenuIcon } from "../config/menuIcons";
import { useAuth } from "../context/AuthContext";
import { findMenuTrailByCode } from "../lib/menu";
import { notificationService } from "../services/notificationService";
import type { DataPortModuleMeta } from "../types/api";

/** /data-port: saare imports kram se (pehle masters, phir transactions). */
export const DataPortHubPage = () => {
  const { permissions } = useAuth();
  const [modules, setModules] = useState<DataPortModuleMeta[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDataPortModules()
      .then((rows) => !cancelled && setModules(rows))
      .catch((error) => {
        if (!cancelled) {
          setModules([]);
          notificationService.showError("Unable to load DataPort modules", error);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4 pb-6 md:space-y-5">
      <Header
        title="DataPort"
        subtitle="Move your existing business data in from Excel — masters first, then stock, sales and payments."
      />
      {modules === null ? (
        <div className="flex min-h-[30vh] items-center justify-center text-sm text-slate-500">
          <Loader2 size={18} className="mr-2 animate-spin" /> Loading…
        </div>
      ) : modules.length === 0 ? (
        <GlassCard className="p-6 text-sm text-slate-600">No DataPort imports are enabled for your role.</GlassCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {modules.map((module, index) => {
            const Icon = resolveMenuIcon(findMenuTrailByCode(permissions?.menus ?? [], module.menuCode)?.menu.menuIcon);
            return (
              <Link
                key={module.key}
                to={`/data-port/${module.key}`}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--theme-color)] hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color:color-mix(in_srgb,var(--theme-color)_10%,white)] text-[var(--theme-color)]">
                    <Icon size={20} />
                  </span>
                  <span className="text-xs font-bold text-slate-300">STEP {index + 1}</span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{module.title}</h3>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-500">{module.description}</p>
                <div className="mt-4 flex items-center justify-between text-xs font-semibold">
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    {module.canImport ? <FileSpreadsheet size={13} /> : <Lock size={13} />}
                    {module.canImport ? `${module.fields.length} columns` : "View only"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[var(--theme-color)]">
                    Open <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

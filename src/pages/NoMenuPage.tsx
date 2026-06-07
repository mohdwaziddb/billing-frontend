import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";

export const NoMenuPage = () => (
  <div className="space-y-4 pb-6">
    <Header title="No Menu Assigned" subtitle="Please contact your administrator to request access." />
    <GlassCard className="p-6 md:p-7">
      <p className="text-sm text-slate-300">No Menu Assigned. Please contact administrator.</p>
    </GlassCard>
  </div>
);

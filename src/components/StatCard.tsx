import { GlassCard } from "./GlassCard";

export const StatCard = ({
  label,
  value,
  caption
}: {
  label: string;
  value: string;
  caption: string;
}) => {
  return (
    <GlassCard className="neon-border rounded-3xl p-6 transition duration-300 hover:-translate-y-1">
      <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{label}</p>
      <p className="mt-4 text-3xl font-extrabold text-white md:text-4xl">{value}</p>
      <p className="mt-3 text-sm text-slate-300/70">{caption}</p>
    </GlassCard>
  );
};

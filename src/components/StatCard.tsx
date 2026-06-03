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
    <GlassCard className="neon-border p-6 transition duration-300 hover:-translate-y-1">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-[2rem]">{value}</p>
      <p className="mt-3 min-h-10 text-sm leading-6 text-slate-300/70">{caption}</p>
    </GlassCard>
  );
};

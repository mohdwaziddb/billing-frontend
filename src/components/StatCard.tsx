import { GlassCard } from "./GlassCard";

export const StatCard = ({
  label,
  value,
  caption,
  onClick
}: {
  label: string;
  value: string;
  caption: string;
  onClick?: () => void;
}) => {
  const content = (
    <>
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className="stat-card-value mt-4 block max-w-full whitespace-nowrap font-extrabold leading-tight text-white">{value}</p>
      <p className="mt-3 min-h-10 text-sm leading-6 text-slate-300/70">{caption}</p>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="block h-full w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60" onClick={onClick}>
        <GlassCard className="stat-card neon-border h-full p-5 transition duration-300 hover:-translate-y-1 xl:p-6">
          {content}
        </GlassCard>
      </button>
    );
  }

  return (
    <GlassCard className="stat-card neon-border p-5 transition duration-300 hover:-translate-y-1 xl:p-6">
      {content}
    </GlassCard>
  );
};

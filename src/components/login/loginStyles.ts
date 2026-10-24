import { gradientSurfaceClass } from "../../lib/theme";

// Common auth-pane styles (LoginCard + MfaChallengeCard): light periwinkle
// inputs with theme focus, theme-gradient primary button. Kahi inline
// duplicate mat karo — sab yahi se aate hain.
export const loginInputClass =
  "h-[54px] w-full rounded-xl border border-[#dbe3f5] bg-[#eef3fc] px-4 text-[15px] font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--theme-color)] focus:bg-white focus:ring-4 focus:ring-[color-mix(in_srgb,var(--theme-color)_12%,transparent)] disabled:cursor-not-allowed disabled:opacity-70";

export const loginPrimaryButtonClass = `flex h-[52px] w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold shadow-[0_14px_28px_rgba(15,23,42,0.16)] transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color-mix(in_srgb,var(--theme-color)_30%,transparent)] disabled:pointer-events-none disabled:opacity-80 disabled:saturate-[0.85] ${gradientSurfaceClass}`;
// opacity-60 par khaali form me button itna fika tha ki "toota hua" lagta tha;
// thoda halka hi kaafi hai (fields bharte hi poora rang).

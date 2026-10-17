import { useEffect } from "react";
import { Clock, Globe, Link2, ReceiptText, Wrench } from "lucide-react";
import { resolveAssetUrl } from "../config/env";
import { PUBLIC_APP_TITLE } from "../config/site";
import { useAuth } from "../context/AuthContext";
import { currentHostname } from "../lib/hosts";

export type StatusNoticeKind = "maintenance" | "invalid";

type StatusNoticeCopy = {
  title: string;
  description: string;
  infoText: (host: string) => string;
};

// Dono states ke liye ek hi layout/design — sirf copy, icon aur accent
// rang badalta hai. Naya status chahiye to yahi ek entry add karo.
const COPY: Record<StatusNoticeKind, StatusNoticeCopy> = {
  invalid: {
    title: "Invalid URL",
    description:
      "The URL you entered is not valid or the domain does not exist. Please check the address and try again.",
    infoText: (host) => `The domain "${host}" is not registered in our system.`
  },
  maintenance: {
    title: "Under Maintenance",
    description:
      "This workspace is temporarily unavailable. We're working on getting it back online as soon as we can. Please try again in a little while.",
    infoText: (host) => `The workspace "${host}" is currently under maintenance.`
  }
};

/**
 * Full-screen branded status page (invalid URL / maintenance).
 * URL kabhi change nahi hota — App isse seedha render karta hai.
 */
export const StatusNotice = ({ kind }: { kind: StatusNoticeKind }) => {
  const { platform } = useAuth();
  const host = currentHostname();
  const brandName = platform.platformName?.trim() || PUBLIC_APP_TITLE;
  const brandLogo = resolveAssetUrl(platform.platformLogo);
  const copy = COPY[kind];
  const isInvalid = kind === "invalid";

  useEffect(() => {
    document.title = `${copy.title} | ${brandName}`;
  }, [brandName, copy.title]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[color-mix(in_srgb,var(--theme-color)_10%,white)] blur-3xl" />
      <div
        className={`pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full blur-3xl ${
          isInvalid ? "bg-rose-100/80" : "bg-amber-100/80"
        }`}
      />
      <section className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-[0_30px_80px_rgba(15,23,42,0.12)] sm:px-10">
        <div className="flex flex-col items-center">
          {brandLogo ? (
            <img src={brandLogo} alt={brandName} className="h-10 w-auto object-contain" />
          ) : (
            <>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--theme-color)_12%,white)] text-[var(--theme-color)]">
                <ReceiptText size={22} />
              </span>
              <p className="mt-2.5 text-base font-extrabold text-slate-900">{brandName}</p>
            </>
          )}
        </div>

        <div className="relative mx-auto mt-7 h-32 w-44">
          <div className="absolute inset-x-3 top-3 h-24 rounded-full bg-sky-100/80 blur-xl" />
          <div className="relative mx-auto w-36 rounded-xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.10)]">
            <div className="flex gap-1 border-b border-slate-100 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>
            <div className="flex h-20 items-center justify-center">
              {isInvalid ? (
                <Globe className="text-sky-500" size={44} />
              ) : (
                <Wrench className="text-slate-500" size={40} />
              )}
            </div>
          </div>
          <span
            className={`absolute bottom-0 right-4 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white shadow-[0_10px_24px_rgba(15,23,42,0.14)] ${
              isInvalid ? "bg-rose-50 text-rose-500" : "bg-amber-50 text-amber-500"
            }`}
          >
            {isInvalid ? <Link2 size={20} /> : <Clock size={20} />}
          </span>
        </div>

        <h1 className="mt-7 text-3xl font-extrabold text-slate-900">{copy.title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">{copy.description}</p>

        <div
          className={`mt-7 flex items-start gap-3 rounded-xl border p-3.5 text-left ${
            isInvalid ? "border-rose-100 bg-rose-50/70" : "border-amber-100 bg-amber-50/70"
          }`}
        >
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              isInvalid ? "bg-rose-100 text-rose-500" : "bg-amber-100 text-amber-600"
            }`}
          >
            {isInvalid ? <Link2 size={18} /> : <Clock size={18} />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{host}</p>
            <p className={`mt-0.5 text-sm ${isInvalid ? "text-rose-600/90" : "text-amber-700/90"}`}>
              {copy.infoText(host)}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

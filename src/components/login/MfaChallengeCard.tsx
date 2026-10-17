import { Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type MfaChallengeCardProps = {
  title?: string;
  subtitle?: string;
  accountLabel?: string | null;
  loading: boolean;
  onSubmit: (code: string) => void;
  onBack: () => void;
};

const CODE_LENGTH = 6;

export const MfaChallengeCard = ({
  title = "Additional Verification Required",
  subtitle = "Your account is protected with Multi-Factor Authentication (MFA). To continue, please enter the verification code from your MFA device below.",
  accountLabel = null,
  loading,
  onSubmit,
  onBack
}: MfaChallengeCardProps) => {
  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(""));
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const canSubmit = digits.every((digit) => digit !== "") && !loading;

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const setDigit = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "").slice(-1);
    setDigits((current) => {
      const next = [...current];
      next[index] = clean;
      return next;
    });
    if (clean && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (event.key === "Enter" && canSubmit) {
      onSubmit(digits.join(""));
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) {
      return;
    }
    event.preventDefault();
    const next = Array(CODE_LENGTH).fill("");
    pasted.split("").forEach((char, index) => {
      next[index] = char;
    });
    setDigits(next);
    inputsRef.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  };

  return (
    <div className="w-full max-w-[620px] rounded-lg border border-slate-200 bg-white p-6 text-left shadow-[0_24px_64px_-24px_rgba(15,23,42,0.25)] sm:p-8">
      <div className="flex flex-col items-center text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-white">
          <ShieldCheck size={22} />
        </span>
        <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Step 2 of 2 — Verification</p>
        <h2 className="mt-1.5 text-[22px] font-bold tracking-tight text-slate-950">{title}</h2>
        {accountLabel ? <p className="mt-0.5 text-sm font-semibold text-slate-600">{accountLabel}</p> : null}
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">{subtitle}</p>
      </div>

      <div className="mx-auto mt-5 w-full max-w-[420px]">
        <div className="flex items-center justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputsRef.current[index] = element;
              }}
              value={digit}
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={1}
              disabled={loading}
              onChange={(event) => setDigit(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              aria-label={`Digit ${index + 1}`}
              className="h-14 w-full min-w-0 flex-1 rounded-xl border border-slate-300 bg-white text-center text-xl font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#2453d8] focus:ring-4 focus:ring-[rgba(36,83,216,0.12)] disabled:bg-slate-50"
            />
          ))}
        </div>
        <p className="mt-2.5 text-center text-xs text-slate-400">Codes refresh every 30 seconds in your authenticator app.</p>
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => onSubmit(digits.join(""))}
        className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#2453d8] text-[15px] font-semibold text-white transition hover:bg-[#1d44b4] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Verifying…
          </>
        ) : (
          "Proceed to Login"
        )}
      </button>

      <button
        type="button"
        disabled={loading}
        onClick={onBack}
        className="mt-2.5 w-full text-center text-sm font-semibold text-slate-500 transition hover:text-slate-900 disabled:opacity-60"
      >
        ← Back to password
      </button>
    </div>
  );
};

import { CircleAlert, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type MfaChallengeCardProps = {
  title?: string;
  subtitle?: string;
  accountLabel?: string | null;
  loading: boolean;
  error: string;
  onSubmit: (code: string) => void;
  onBack: () => void;
};

const CODE_LENGTH = 6;

export const MfaChallengeCard = ({
  title = "Additional Verification Required",
  subtitle = "Your account is protected with Multi-Factor Authentication (MFA). To continue, please enter the verification code from your MFA device below.",
  accountLabel = null,
  loading,
  error,
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
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_24px_64px_-24px_rgba(15,23,42,0.25)] sm:p-8">
      <div className="flex flex-col items-center text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white">
          <ShieldCheck size={22} />
        </span>
        <h2 className="mt-4 text-xl font-bold text-slate-950">{title}</h2>
        {accountLabel ? <p className="mt-1 text-sm font-semibold text-slate-600">{accountLabel}</p> : null}
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{subtitle}</p>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
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
            className="h-12 w-11 rounded-xl border border-slate-300 bg-white text-center text-xl font-bold text-slate-950 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10 disabled:bg-slate-50 sm:h-14 sm:w-12"
          />
        ))}
      </div>

      {error ? (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">
          <CircleAlert size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => onSubmit(digits.join(""))}
        className="mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-[15px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
        className="mt-3 w-full text-center text-sm font-semibold text-slate-500 transition hover:text-slate-900 disabled:opacity-60"
      >
        ← Back to password
      </button>
    </div>
  );
};

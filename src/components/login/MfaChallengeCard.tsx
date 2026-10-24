import { Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { loginPrimaryButtonClass } from "./loginStyles";

type MfaChallengeCardProps = {
  title?: string;
  subtitle?: string;
  accountLabel?: string | null;
  loading: boolean;
  onSubmit: (code: string) => void;
  onBack: () => void;
};

const CODE_LENGTH = 6;

const digitInputClass =
  "h-14 w-full min-w-0 flex-1 rounded-xl border border-[#dbe3f5] bg-[#eef3fc] text-center text-xl font-bold text-slate-950 outline-none transition focus:border-[var(--theme-color)] focus:bg-white focus:ring-4 focus:ring-[color-mix(in_srgb,var(--theme-color)_12%,transparent)] disabled:opacity-70";

/**
 * MFA step pane — LoginShell ke andar render hota hai (LoginCard jaisa
 * hi pane, card chrome ke bina).
 */
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
    const allDigits = value.replace(/\D/g, "");
    // iOS / password manager "one-time-code" autofill poora code ek box me
    // daalta hai — pehle sirf aakhri digit bachta tha. Ab aage ke boxes me baanto.
    // Bhare box me ek digit type karna (purana + naya = 2 chars) replace hi rahe.
    const typedOverExisting = allDigits.length === 2 && digits[index] !== "";
    if (allDigits.length > 1 && !typedOverExisting) {
      const chars = allDigits.slice(0, CODE_LENGTH - index).split("");
      setDigits((current) => {
        const next = [...current];
        chars.forEach((char, offset) => {
          next[index + offset] = char;
        });
        return next;
      });
      inputsRef.current[Math.min(index + chars.length, CODE_LENGTH - 1)]?.focus();
      return;
    }
    const clean = allDigits.slice(-1);
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
    <div className="w-full text-left">
      <div className="flex flex-col items-center text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
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
              maxLength={index === 0 ? CODE_LENGTH : 1}
              disabled={loading}
              onChange={(event) => setDigit(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              aria-label={`Digit ${index + 1}`}
              className={digitInputClass}
            />
          ))}
        </div>
        <p className="mt-2.5 text-center text-xs text-slate-400">Codes refresh every 30 seconds in your authenticator app.</p>
      </div>

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => onSubmit(digits.join(""))}
        className={`mt-5 ${loginPrimaryButtonClass}`}
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

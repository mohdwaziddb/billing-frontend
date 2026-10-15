import { ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMfaStatus } from "../api/mfa";

export const MfaEnrollBanner = () => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getMfaStatus()
      .then((status) => {
        if (!cancelled && status.applyMfaByCompany && !status.mfaEnabled) {
          setVisible(true);
        }
      })
      .catch(() => {
        // Banner optional hai — API fail ho to chup-chaap nahi dikhao.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible || dismissed) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <ShieldCheck size={18} />
      </span>
      <p className="flex-1 text-sm font-medium text-amber-900">
        Protect your account with Two-Step Verification — an authenticator code will be required at login.{" "}
        <Link to="/setup/two-step-verification" className="font-bold underline hover:text-amber-950">
          Enable now
        </Link>
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-amber-700 transition hover:bg-amber-100"
      >
        <X size={16} />
      </button>
    </div>
  );
};

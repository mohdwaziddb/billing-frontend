import { CheckCircle2, CircleAlert, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { ForgotPasswordModal } from "../ForgotPasswordModal";
import { LoginBrand } from "./LoginBrand";

const REMEMBER_ME_KEY = "billing_frontend_remember_me";

const inputBaseClass =
  "h-[56px] w-full rounded-xl border bg-white text-[15px] font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2453d8] focus:ring-4 focus:ring-[rgba(36,83,216,0.12)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

type LoginCardProps = {
  username: string;
  password: string;
  loading: boolean;
  canSubmit: boolean;
  error: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
};

export const LoginCard = ({
  username,
  password,
  loading,
  canSubmit,
  error,
  onUsernameChange,
  onPasswordChange,
  onSubmit
}: LoginCardProps) => {
  const [remember, setRemember] = useState(() => {
    try {
      return localStorage.getItem(REMEMBER_ME_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const toggleRemember = () => {
    const next = !remember;
    setRemember(next);
    try {
      localStorage.setItem(REMEMBER_ME_KEY, next ? "1" : "0");
    } catch {
      // Ignore storage errors in private / restricted browser modes.
    }
  };

  return (
    <>
      <div className="w-full max-w-[620px] rounded-[24px] border border-slate-200 bg-white p-8 text-left shadow-[0_28px_70px_rgba(15,23,42,0.12)] sm:p-12">
        <LoginBrand />
        <div className="mt-8 text-left">
          <h2 className="text-[30px] font-extrabold tracking-[-0.03em] text-slate-950">Welcome back</h2>
          <p className="mt-2 text-[15px] leading-7 text-slate-500">Sign in to continue to your Bizio workspace.</p>
        </div>

        <form
          className="mt-8 space-y-6"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!loading && canSubmit) {
              onSubmit();
            }
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="login-email" className="block text-[13px] font-bold text-slate-700">
              Email address
            </label>
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={username}
                disabled={loading}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error" : undefined}
                className={`${inputBaseClass} pl-10 ${
                  error ? "border-red-300 focus:border-[#DC2626] focus:ring-[rgba(220,38,38,0.10)]" : "border-slate-200"
                }`}
                onChange={(event) => onUsernameChange(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password" className="block text-[13px] font-bold text-slate-700">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="login-password"
                type={passwordVisible ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                disabled={loading}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error" : undefined}
                className={`${inputBaseClass} pl-10 pr-12 ${
                  error ? "border-red-300 focus:border-[#DC2626] focus:ring-[rgba(220,38,38,0.10)]" : "border-slate-200"
                }`}
                onChange={(event) => onPasswordChange(event.target.value)}
              />
              <button
                type="button"
                aria-label={passwordVisible ? "Hide password" : "Show password"}
                disabled={loading}
                className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
                onClick={() => setPasswordVisible((current) => !current)}
              >
                {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                checked={remember}
                disabled={loading}
                className="h-4 w-4 rounded border-slate-300 accent-[#2453d8] focus:ring-2 focus:ring-[rgba(36,83,216,0.30)]"
                onChange={toggleRemember}
              />
              Remember me
            </label>
            <button
              type="button"
              disabled={loading}
              className="rounded text-sm font-bold text-[#2453d8] transition hover:text-[#1d47bd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(36,83,216,0.40)] disabled:cursor-not-allowed"
              onClick={() => setForgotOpen(true)}
            >
              Forgot password?
            </button>
          </div>

          {error ? (
            <div
              id="login-error"
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
            >
              <CircleAlert size={17} className="mt-0.5 shrink-0 text-[#DC2626]" />
              <p className="text-sm font-medium leading-5 text-[#DC2626]">{error}</p>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || !canSubmit}
            aria-busy={loading}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#2453d8] text-[15px] font-semibold text-white shadow-[0_14px_28px_rgba(36,83,216,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1d47bd] hover:shadow-[0_18px_36px_rgba(36,83,216,0.30)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(36,83,216,0.30)] disabled:pointer-events-none disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </button>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.10em] text-slate-400">Your Bizio workspace</p>
            <ul className="mt-2.5 space-y-2">
              {[
                "Track sales, collections and outstanding from one dashboard",
                "Manage customers, invoices and payments in one place",
                "Get clear analytics and reports for better decisions"
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[12px] font-medium leading-5 text-slate-600">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#2453d8]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </form>
      </div>

      <ForgotPasswordModal open={forgotOpen} initialUsername={username} tone="brand" onClose={() => setForgotOpen(false)} />
    </>
  );
};
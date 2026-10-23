import { Eye, EyeOff, Loader2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { ForgotPasswordModal } from "../ForgotPasswordModal";
import { loginInputClass, loginPrimaryButtonClass } from "./loginStyles";

import { isRememberMe, REMEMBER_ME_KEY } from "../../lib/storage";

type LoginCardProps = {
  username: string;
  password: string;
  loading: boolean;
  canSubmit: boolean;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  title?: string;
  subtitle?: string;
  fieldLabel?: string;
  fieldPlaceholder?: string;
  inputType?: "email" | "text";
  showForgotPassword?: boolean;
  bottomBox?: ReactNode;
};

/**
 * Common login form pane (tenant login + platform admin login). Card chrome
 * nahi — ye LoginShell ke andar render hota hai.
 */
export const LoginCard = ({
  username,
  password,
  loading,
  canSubmit,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  title = "Welcome!",
  subtitle = "Kindly enter your credentials to access your account.",
  fieldLabel = "Email address",
  fieldPlaceholder,
  inputType = "email",
  showForgotPassword = true,
  bottomBox
}: LoginCardProps) => {
  // Ab ye sach me kaam karta hai: off = session sirf is tab tak (lib/storage).
  const [remember, setRemember] = useState(isRememberMe);
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
      <div className="w-full text-left">
        <h2 className="text-[28px] font-extrabold tracking-[-0.02em] text-slate-950">{title}</h2>
        <p className="mt-1.5 text-[14px] leading-6 text-slate-500">{subtitle}</p>

        <form
          className="mt-7 space-y-5"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!loading && canSubmit) {
              onSubmit();
            }
          }}
        >
          <input
            id="login-email"
            type={inputType}
            autoComplete={inputType === "email" ? "email" : "username"}
            placeholder={fieldPlaceholder ?? fieldLabel}
            aria-label={fieldLabel}
            value={username}
            disabled={loading}
            className={loginInputClass}
            onChange={(event) => onUsernameChange(event.target.value)}
          />

          <div className="relative">
            <input
              id="login-password"
              type={passwordVisible ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Password"
              aria-label="Password"
              value={password}
              disabled={loading}
              className={`${loginInputClass} pr-12`}
              onChange={(event) => onPasswordChange(event.target.value)}
            />
            <button
              type="button"
              aria-label={passwordVisible ? "Hide password" : "Show password"}
              disabled={loading}
              className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed"
              onClick={() => setPasswordVisible((current) => !current)}
            >
              {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                checked={remember}
                disabled={loading}
                className="h-4 w-4 rounded border-slate-300 accent-[var(--theme-color)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--theme-color)_30%,transparent)]"
                onChange={toggleRemember}
              />
              Remember me
            </label>
            {showForgotPassword ? (
              <button
                type="button"
                disabled={loading}
                className="rounded text-sm font-bold text-[var(--theme-color)] transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--theme-color)_40%,transparent)] disabled:cursor-not-allowed"
                onClick={() => setForgotOpen(true)}
              >
                Forgot Password?
              </button>
            ) : null}
          </div>

          <button type="submit" disabled={loading || !canSubmit} aria-busy={loading} className={loginPrimaryButtonClass}>
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </button>

          {bottomBox ? <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">{bottomBox}</div> : null}
        </form>
      </div>

      <ForgotPasswordModal open={forgotOpen} initialUsername={username} tone="brand" onClose={() => setForgotOpen(false)} />
    </>
  );
};

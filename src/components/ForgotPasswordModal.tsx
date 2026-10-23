import { Eye, EyeOff, KeyRound, Loader2, Lock, User } from "lucide-react";
import { useEffect, useState } from "react";
import { confirmPasswordResetOtp, requestPasswordResetOtp, verifyPasswordResetOtp } from "../api/auth";
import { useApiMessage } from "../hooks/useApiFeedback";
import { notificationService } from "../services/notificationService";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { PasswordInput } from "./PasswordInput";

type ForgotPasswordModalProps = {
  open: boolean;
  initialUsername?: string;
  onClose: () => void;
  tone?: "theme" | "brand";
  identifierLocked?: boolean;
};

const brandFieldBaseClass =
  "h-[50px] w-full rounded-xl border bg-white text-[15px] font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2453d8] focus:ring-4 focus:ring-[rgba(36,83,216,0.12)] disabled:bg-slate-50 disabled:opacity-70";

const BrandTextField = ({
  id,
  label,
  value,
  placeholder,
  inputMode,
  onChange,
  disabled,
  icon
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  inputMode?: "text" | "numeric";
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
  icon: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="block text-[13px] font-bold text-slate-700">
      {label} <span className="text-rose-400">*</span>
    </label>
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
      <input
        id={id}
        type="text"
        inputMode={inputMode ?? "text"}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        className={`${brandFieldBaseClass} border-slate-200 pl-10`}
        onChange={onChange}
      />
    </div>
  </div>
);

const BrandPasswordField = ({
  id,
  label,
  value,
  onChange,
  disabled
}: {
  id: string;
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-bold text-slate-700">
        {label} <span className="text-rose-400">*</span>
      </label>
      <div className="relative">
        <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          value={value}
          disabled={disabled}
          className={`${brandFieldBaseClass} border-slate-200 pl-10 pr-12`}
          onChange={onChange}
        />
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          disabled={disabled}
          className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
};

export const ForgotPasswordModal = ({
  open,
  initialUsername = "",
  onClose,
  tone = "theme",
  identifierLocked = false
}: ForgotPasswordModalProps) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [identifier, setIdentifier] = useState(initialUsername);
  const [challengeId, setChallengeId] = useState<number | null>(null);
  const [maskedDestination, setMaskedDestination] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const { clearMessage, setApiError } = useApiMessage();
  const isBrand = tone === "brand";

  useEffect(() => {
    if (cooldownLeft <= 0) {
      return;
    }
    const timer = window.setTimeout(() => setCooldownLeft((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldownLeft]);

  const isStrongPassword = (value: string) =>
    value.length >= 8 && /[A-Za-z]/.test(value) && /[0-9]/.test(value);

  useEffect(() => {
    if (open) {
      setStep(1);
      setIdentifier(initialUsername);
      setChallengeId(null);
      setMaskedDestination("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      clearMessage();
    }
  }, [clearMessage, initialUsername, open]);

  const close = () => {
    clearMessage();
    onClose();
  };

  const sendOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessage();
    if (cooldownLeft > 0) {
      notificationService.showError(`Please wait ${cooldownLeft}s before requesting a new OTP.`);
      return;
    }
    const value = identifier.trim();
    if (!value && !identifierLocked) {
      notificationService.showError("Enter your email, mobile number or username first.");
      return;
    }
    try {
      setSaving(true);
      const challenge = await requestPasswordResetOtp({ identifier: value });
      // 60s resend cooldown (mirrors backend) to stop OTP spam/flooding.
      setCooldownLeft(60);
      if (challenge?.challengeId == null) {
        notificationService.showSuccess("If an account exists for this identifier, an OTP has been sent.");
        close();
        return;
      }
      setChallengeId(challenge.challengeId);
      setMaskedDestination(challenge.maskedDestination ?? "");
      setStep(2);
      notificationService.showSuccess(
        challenge.maskedDestination ? `OTP sent to ${challenge.maskedDestination}` : "If an account exists, an OTP has been sent to its registered email."
      );
    } catch (err: any) {
      setApiError(err, "Unable to send OTP");
    } finally {
      setSaving(false);
    }
  };

  const verifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessage();
    if (challengeId == null) {
      notificationService.showError("Please request a fresh OTP first.");
      setStep(1);
      return;
    }
    if (otp.trim().length !== 6) {
      notificationService.showError("Enter the 6-digit OTP you received on your email.");
      return;
    }
    try {
      setSaving(true);
      await verifyPasswordResetOtp({ challengeId, otp: otp.trim() });
      setStep(3);
      notificationService.showSuccess("OTP verified. Set your new password.");
    } catch (err: any) {
      setApiError(err, "Unable to verify OTP");
    } finally {
      setSaving(false);
    }
  };

  const confirmReset = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessage();
    if (challengeId == null) {
      notificationService.showError("Please request a fresh OTP first.");
      setStep(1);
      return;
    }
    if (!isStrongPassword(newPassword)) {
      notificationService.showError("Password must be at least 8 characters with a letter and a number.");
      return;
    }
    if (newPassword !== confirmPassword) {
      notificationService.showError("New password and confirm password must match.");
      return;
    }
    try {
      setSaving(true);
      await confirmPasswordResetOtp({ challengeId, otp: otp.trim(), newPassword, confirmPassword });
      notificationService.showSuccess("Password updated successfully. Please sign in again.");
      close();
    } catch (err: any) {
      setApiError(err, "Unable to update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Forgot Password" eyebrow="Account Security" maxWidthClass="max-w-md" onClose={close}>
      {step === 1 ? (
        <form
          className="space-y-4"
          style={{ fontFamily: isBrand ? "Manrope, Inter, system-ui, sans-serif" : undefined }}
          onSubmit={sendOtp}
        >
          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--theme-color)] shadow-sm">
              <KeyRound size={18} />
            </span>
            <p className="min-w-0 text-sm font-medium leading-6 text-slate-600">
              Enter your account identifier. We will send a 6-digit one-time password to your registered email.
            </p>
          </div>

          {isBrand ? (
            <BrandTextField
              id="forgot-modal-identifier"
              label="Email / Mobile / Username"
              value={identifier}
              placeholder="Enter your email, mobile or username"
              onChange={(event) => setIdentifier(event.target.value)}
              disabled={saving || identifierLocked}
              icon={<User size={16} />}
            />
          ) : (
            <div className="space-y-1.5">
              <label htmlFor="forgot-modal-identifier" className="block text-[13px] font-bold text-slate-700">
                Email / Mobile / Username <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="forgot-modal-identifier"
                  type="text"
                  autoComplete="username"
                  placeholder="Enter your email, mobile or username"
                  value={identifier}
                  disabled={saving || identifierLocked}
                  className="h-[50px] w-full rounded-xl border border-slate-200 bg-white pl-10 text-[15px] font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--theme-color)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                  onChange={(event) => setIdentifier(event.target.value)}
                />
              </div>
            </div>
          )}

          {identifierLocked ? (
            <p className="text-xs font-medium text-slate-400">
              OTP will be sent to this registered email only.
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {isBrand ? (
              <button
                type="button"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={close}
              >
                Close
              </button>
            ) : (
              <Button type="button" variant="ghost" disabled={saving} onClick={close}>
                Close
              </Button>
            )}
            {isBrand ? (
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl bg-[#2453d8] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,83,216,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1d47bd] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send OTP"
                )}
              </button>
            ) : (
              <Button type="submit" disabled={saving}>
                {saving ? "Sending..." : "Send OTP"}
              </Button>
            )}
          </div>
        </form>
      ) : step === 2 ? (
        <form
          className="space-y-4"
          style={{ fontFamily: isBrand ? "Manrope, Inter, system-ui, sans-serif" : undefined }}
          onSubmit={verifyOtp}
        >
          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--theme-color)] shadow-sm">
              <KeyRound size={18} />
            </span>
            <p className="min-w-0 text-sm font-medium leading-6 text-slate-600">
              {maskedDestination
                ? `Enter the 6-digit OTP sent to ${maskedDestination}. It expires in 10 minutes.`
                : "Enter the 6-digit OTP sent to your email. It expires in 10 minutes."}
            </p>
          </div>

          {isBrand ? (
            <BrandTextField
              id="forgot-modal-otp"
              label="One-Time Password"
              value={otp}
              placeholder="6-digit OTP"
              inputMode="numeric"
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              disabled={saving}
              icon={<KeyRound size={16} />}
            />
          ) : (
            <div className="space-y-1.5">
              <label htmlFor="forgot-modal-otp" className="block text-[13px] font-bold text-slate-700">
                One-Time Password <span className="text-rose-400">*</span>
              </label>
              <input
                id="forgot-modal-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit OTP"
                value={otp}
                disabled={saving}
                className="h-[50px] w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] font-medium tracking-[0.18em] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--theme-color)] disabled:bg-slate-50"
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={saving || cooldownLeft > 0}
              className="rounded text-sm font-bold text-[#2453d8] transition hover:text-[#1d47bd] disabled:cursor-not-allowed"
              onClick={sendOtp}
            >
              {cooldownLeft > 0 ? `Resend OTP in ${cooldownLeft}s` : "Resend OTP"}
            </button>
            {isBrand ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={close}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl bg-[#2453d8] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,83,216,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1d47bd] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify OTP"
                  )}
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button type="button" variant="ghost" disabled={saving} onClick={close}>
                  Close
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Verifying..." : "Verify OTP"}
                </Button>
              </div>
            )}
          </div>
        </form>
      ) : (
        <form
          className="space-y-4"
          style={{ fontFamily: isBrand ? "Manrope, Inter, system-ui, sans-serif" : undefined }}
          onSubmit={confirmReset}
        >
          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--theme-color)] shadow-sm">
              <Lock size={16} />
            </span>
            <p className="min-w-0 text-sm font-medium leading-6 text-slate-600">
              OTP verified. Set your new password below.
            </p>
          </div>

          {isBrand ? (
            <>
              <BrandPasswordField
                id="forgot-modal-new-password"
                label="New Password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={saving}
              />
              <BrandPasswordField
                id="forgot-modal-confirm-password"
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={saving}
              />
            </>
          ) : (
            <>
              <PasswordInput
                label="New Password"
                requiredMark
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <PasswordInput
                label="Confirm New Password"
                requiredMark
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </>
          )}

          <div className="flex items-center justify-end">
            <div className="flex gap-3">
              <Button type="button" variant="ghost" disabled={saving} onClick={close}>
                Close
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Updating..." : "Update password"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};

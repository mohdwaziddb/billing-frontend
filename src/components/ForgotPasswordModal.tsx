import { Eye, EyeOff, KeyRound, Loader2, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { forgotPasswordRequest } from "../api/auth";
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
};

const brandFieldBaseClass =
  "h-[50px] w-full rounded-xl border bg-white text-[15px] font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2453d8] focus:ring-4 focus:ring-[rgba(36,83,216,0.12)] disabled:bg-slate-50 disabled:opacity-70";

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

export const ForgotPasswordModal = ({ open, initialUsername = "", onClose, tone = "theme" }: ForgotPasswordModalProps) => {
  const [form, setForm] = useState({
    username: initialUsername,
    newPassword: "",
    confirmPassword: ""
  });
  const [saving, setSaving] = useState(false);
  const { clearMessage, setApiError } = useApiMessage();
  const isBrand = tone === "brand";

  useEffect(() => {
    if (open) {
      setForm({ username: initialUsername, newPassword: "", confirmPassword: "" });
      clearMessage();
    }
  }, [clearMessage, initialUsername, open]);

  const close = () => {
    setForm({ username: initialUsername, newPassword: "", confirmPassword: "" });
    clearMessage();
    onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessage();
    const username = form.username.trim();

    if (!username) {
      notificationService.showError("Enter your account identifier on the sign in screen first.");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      notificationService.showError("New password and confirm password must match.");
      return;
    }

    try {
      setSaving(true);
      await forgotPasswordRequest({
        username,
        newPassword: form.newPassword
      });
      setForm((current) => ({ ...current, newPassword: "", confirmPassword: "" }));
      notificationService.showSuccess("Password updated successfully");
      close();
    } catch (err: any) {
      setApiError(err, "Unable to update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Forgot Password" eyebrow="Account Security" maxWidthClass="max-w-md" onClose={close}>
      <form
        className="space-y-4"
        style={{ fontFamily: isBrand ? "Manrope, Inter, system-ui, sans-serif" : undefined }}
        onSubmit={submit}
      >
        {isBrand ? (
          <div className="flex items-start gap-3 rounded-2xl border border-[#d7e3ff] bg-blue-50/60 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2453d8] text-white shadow-[0_8px_18px_rgba(36,83,216,0.25)]">
              <KeyRound size={18} />
            </span>
            <p className="min-w-0 text-sm font-medium leading-6 text-slate-600">Set a new password for your account.</p>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--theme-color)] shadow-sm">
              <KeyRound size={18} />
            </span>
            <p className="min-w-0 text-sm font-medium leading-6 text-slate-600">Set a new password for your account.</p>
          </div>
        )}

        {isBrand ? (
          <>
            <BrandPasswordField
              id="forgot-modal-new-password"
              label="New Password"
              value={form.newPassword}
              disabled={saving}
              onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))}
            />
            <BrandPasswordField
              id="forgot-modal-confirm-password"
              label="Confirm Password"
              value={form.confirmPassword}
              disabled={saving}
              onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
            />
          </>
        ) : (
          <>
            <PasswordInput
              label="New Password"
              requiredMark
              value={form.newPassword}
              onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))}
            />
            <PasswordInput
              label="Confirm Password"
              requiredMark
              value={form.confirmPassword}
              onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
            />
          </>
        )}

        {isBrand ? (
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(36,83,216,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={close}
            >
              Close
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl bg-[#2453d8] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(36,83,216,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1d47bd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(36,83,216,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Updating...
                </>
              ) : (
                "Update password"
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" disabled={saving} onClick={close}>
              Close
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Updating..." : "Update password"}
            </Button>
          </div>
        )}
      </form>
    </Modal>
  );
};
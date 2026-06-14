import { KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { forgotPasswordRequest } from "../api/auth";
import { useApiMessage } from "../hooks/useApiFeedback";
import { Button } from "./Button";
import { Input } from "./Input";
import { Modal } from "./Modal";
import { PasswordInput } from "./PasswordInput";

type ForgotPasswordModalProps = {
  open: boolean;
  initialUsername?: string;
  onClose: () => void;
};

export const ForgotPasswordModal = ({ open, initialUsername = "", onClose }: ForgotPasswordModalProps) => {
  const [form, setForm] = useState({
    username: initialUsername,
    newPassword: "",
    confirmPassword: ""
  });
  const [saving, setSaving] = useState(false);
  const { message, setMessage, clearMessage, setApiError } = useApiMessage();

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
      setMessage("Enter your registered Mobile Number or Email ID on the sign in screen first.");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setMessage("New password and confirm password must match.");
      return;
    }

    try {
      setSaving(true);
      await forgotPasswordRequest({
        username,
        newPassword: form.newPassword
      });
      setMessage("Password updated successfully. Please sign in with your new password.");
      setForm((current) => ({ ...current, newPassword: "", confirmPassword: "" }));
    } catch (err: any) {
      setApiError(err, "Unable to update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Forgot Password" eyebrow="Account Security" maxWidthClass="max-w-md" onClose={close}>
      <form className="space-y-4" onSubmit={submit}>
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--theme-color)] shadow-sm">
            <KeyRound size={18} />
          </span>
          <p className="min-w-0 text-sm font-medium leading-6 text-slate-600">Confirm the registered Mobile Number or Email ID and set a new password.</p>
        </div>
        <Input
          label="Mobile Number or Email ID"
          requiredMark
          type="text"
          inputMode="email"
          value={form.username}
          readOnly
          className="cursor-not-allowed bg-slate-100 text-slate-500"
        />
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
        {message ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
            {message}
          </div>
        ) : null}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={close}>
            Close
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Updating..." : "Update password"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

import { KeyRound } from "lucide-react";
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
};

export const ForgotPasswordModal = ({ open, initialUsername = "", onClose }: ForgotPasswordModalProps) => {
  const [form, setForm] = useState({
    username: initialUsername,
    newPassword: "",
    confirmPassword: ""
  });
  const [saving, setSaving] = useState(false);
  const { clearMessage, setApiError } = useApiMessage();

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
      <form className="space-y-4" onSubmit={submit}>
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--theme-color)] shadow-sm">
            <KeyRound size={18} />
          </span>
          <p className="min-w-0 text-sm font-medium leading-6 text-slate-600">Set a new password for your account.</p>
        </div>
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
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" disabled={saving} onClick={close}>
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

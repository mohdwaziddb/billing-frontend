import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { ForgotPasswordModal } from "../components/ForgotPasswordModal";
import { GlassCard } from "../components/GlassCard";
import { Input } from "../components/Input";
import { PasswordInput } from "../components/PasswordInput";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const { clearMessage, setApiError } = useApiMessage();
  const canOpenForgotPassword = form.username.trim().length > 0;
  const canSubmit = Boolean(form.username.trim() && form.password.trim());

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/dashboard";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      clearMessage();
      const firstRoute = await login(form);
      navigate(firstRoute ?? "/no-menu", { replace: true });
    } catch (err: any) {
      setApiError(err, "Unable to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4 py-10">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col justify-center">
          <p className="text-sm uppercase tracking-[0.45em] text-[var(--theme-color)]">Billing operations platform</p>
          <h1 className="mt-6 text-5xl font-extrabold leading-tight text-slate-950 md:text-6xl">
            Financial control built for day-to-day billing teams.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-600">
            Manage customers, invoices, collections, reminders, and analytics from one secure enterprise workspace.
          </p>
        </div>

        <GlassCard className="p-8 md:p-10">
          <p className="text-sm uppercase tracking-[0.35em] text-[var(--theme-color)]">Welcome back</p>
          <h2 className="mt-4 text-3xl font-extrabold text-slate-950">Sign in to your workspace</h2>
          <form className="mt-8 space-y-4" onSubmit={submit}>
            <Input
              label="Email / Mobile / Username"
              requiredMark
              type="text"
              placeholder="Email / Mobile / Username"
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
            />
            <PasswordInput
              label="Password"
              requiredMark
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            />
            <div className="flex justify-end">
              <button
                type="button"
                className="text-sm font-semibold text-[var(--theme-color)] transition hover:text-[var(--theme-hover)] disabled:cursor-not-allowed disabled:text-slate-400"
                disabled={!canOpenForgotPassword}
                title={canOpenForgotPassword ? "Reset password" : "Enter Email / Mobile / Username first"}
                onClick={() => setForgotPasswordOpen(true)}
              >
                Forgot password?
              </button>
            </div>
            <Button className="w-full" disabled={loading || !canSubmit} type="submit">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-6 text-sm text-slate-600">
            Need a workspace?{" "}
            <Link className="font-semibold text-[var(--theme-color)]" to="/register">
              Register company
            </Link>
          </p>
        </GlassCard>
      </div>
      <ForgotPasswordModal open={forgotPasswordOpen} initialUsername={form.username} onClose={() => setForgotPasswordOpen(false)} />
    </div>
  );
};

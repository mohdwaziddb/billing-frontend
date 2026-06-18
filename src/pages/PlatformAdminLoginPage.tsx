import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Input } from "../components/Input";
import { PasswordInput } from "../components/PasswordInput";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";

export const PlatformAdminLoginPage = () => {
  const { loginPlatformAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { clearMessage, setApiError } = useApiMessage();
  const canSubmit = Boolean(form.username.trim() && form.password.trim());
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/platform-admin/dashboard";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      clearMessage();
      const nextRoute = await loginPlatformAdmin(form);
      navigate(from.startsWith("/platform-admin") ? from : nextRoute, { replace: true });
    } catch (err) {
      setApiError(err, "Unable to sign in as platform admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4 py-10">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col justify-center">
          <p className="text-sm uppercase tracking-[0.45em] text-[var(--theme-color)]">Platform owner access</p>
          <h1 className="mt-6 text-5xl font-extrabold leading-tight text-slate-950 md:text-6xl">
            Manage the billing platform without entering any company workspace.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-600">
            View all companies, control activation, and update platform credentials from a separate protected session.
          </p>
        </div>

        <GlassCard className="p-8 md:p-10">
          <p className="text-sm uppercase tracking-[0.35em] text-[var(--theme-color)]">Platform Admin</p>
          <h2 className="mt-4 text-3xl font-extrabold text-slate-950">Sign in to platform control</h2>
          <form className="mt-8 space-y-4" onSubmit={submit}>
            <Input
              label="Username"
              requiredMark
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
            />
            <PasswordInput
              label="Password"
              requiredMark
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            />
            <Button className="w-full" disabled={loading || !canSubmit} type="submit">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-6 text-sm text-slate-600">
            Need company access instead?{" "}
            <Link className="font-semibold text-[var(--theme-color)]" to="/login">
              Go to workspace login
            </Link>
          </p>
        </GlassCard>
      </div>
    </div>
  );
};

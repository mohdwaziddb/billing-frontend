import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Input } from "../components/Input";
import { PasswordInput } from "../components/PasswordInput";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";

const PUBLIC_APP_TITLE = "Bizfinity Technologies Pvt. Ltd.";

export const LoginPage = () => {
  const { auth, sessionType, permissions, firstAccessibleRoute, login, platform } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { clearMessage, setApiError } = useApiMessage();
  const canSubmit = Boolean(form.username.trim() && form.password.trim());

  useEffect(() => {
    if (!auth?.accessToken) {
      return;
    }
    if (sessionType === "platform-admin") {
      navigate("/platform-admin/dashboard", { replace: true });
      return;
    }
    if (sessionType === "user" && permissions) {
      navigate(firstAccessibleRoute() ?? "/dashboard", { replace: true });
    }
  }, [auth?.accessToken, firstAccessibleRoute, navigate, permissions, sessionType]);

  useEffect(() => {
    document.title = `Login | ${platform.platformName || PUBLIC_APP_TITLE}`;
  }, [platform.platformName]);

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
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:text-[var(--theme-color)]"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </Link>
          </div>
          <p className="mt-8 text-sm uppercase tracking-[0.45em] text-[var(--theme-color)]">Billing operations platform</p>
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
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Access your billing, inventory, payments, and business operations from one secure workspace.
          </p>
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
            <Button className="w-full" disabled={loading || !canSubmit} type="submit">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
};

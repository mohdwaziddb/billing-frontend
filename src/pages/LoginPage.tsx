import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Input } from "../components/Input";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { message: error, clearMessage, setApiError } = useApiMessage();

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/dashboard";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      clearMessage();
      await login(form);
      navigate(from, { replace: true });
    } catch (err: any) {
      setApiError(err, "Unable to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="noise flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col justify-center">
          <p className="text-sm uppercase tracking-[0.45em] text-sky-200/80">Billing operations platform</p>
          <h1 className="mt-6 text-5xl font-extrabold leading-tight text-white md:text-6xl">
            Financial control built for day-to-day billing teams.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-300/75">
            Manage customers, invoices, collections, reminders, and analytics from one secure enterprise workspace.
          </p>
        </div>

        <GlassCard className="neon-border p-8 md:p-10">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-200/70">Welcome back</p>
          <h2 className="mt-4 text-3xl font-extrabold text-white">Sign in to NovaBill</h2>
          <form className="mt-8 space-y-4" onSubmit={submit}>
            <Input
              label="Mobile Number or Email ID"
              requiredMark
              type="text"
              inputMode="email"
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
            />
            <Input
              label="Password"
              requiredMark
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            />
            {error ? <div className="rounded-[24px] border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
            <Button className="w-full" disabled={loading} type="submit">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-6 text-sm text-slate-300/75">
            Need a workspace?{" "}
            <Link className="font-semibold text-sky-200" to="/register">
              Register company
            </Link>
          </p>
        </GlassCard>
      </div>
    </div>
  );
};

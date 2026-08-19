import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnalyticsShowcase } from "../components/login/AnalyticsShowcase";
import { LoginCard } from "../components/login/LoginCard";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";
import { getApiErrorMessage } from "../lib/errors";

const PUBLIC_APP_TITLE = "Bizio Technologies Pvt. Ltd.";

export const PlatformAdminLoginPage = () => {
  const { loginPlatformAdmin, platform } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { clearMessage, setApiError } = useApiMessage();
  const canSubmit = Boolean(form.username.trim() && form.password.trim());
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/platform-admin/dashboard";

  useEffect(() => {
    document.title = `Platform Admin Login | ${platform.platformName || PUBLIC_APP_TITLE}`;
  }, [platform.platformName]);

  const submit = async () => {
    try {
      setLoading(true);
      setError("");
      clearMessage();
      const nextRoute = await loginPlatformAdmin(form);
      navigate(from.startsWith("/platform-admin") ? from : nextRoute, { replace: true });
    } catch (err: any) {
      const message = getApiErrorMessage(err, "Unable to sign in as platform admin");
      setError(message);
      setApiError(err, "Unable to sign in as platform admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#f8fafc]"
      style={{ fontFamily: "Manrope, Inter, system-ui, sans-serif" }}
    >
      <div className="grid flex-1 lg:grid-cols-2">
        <AnalyticsShowcase />
        <main className="relative flex items-center justify-center px-4 py-10 sm:px-8 lg:py-12">
          <LoginCard
            username={form.username}
            password={form.password}
            loading={loading}
            canSubmit={canSubmit}
            error={error}
            title="Platform Admin Sign in"
            subtitle="Sign in to manage companies and platform settings from a separate protected session."
            fieldLabel="Username"
            fieldPlaceholder="Enter your username"
            inputType="text"
            showForgotPassword={false}
            onUsernameChange={(value) => {
              setForm((current) => ({ ...current, username: value }));
              if (error) {
                setError("");
              }
            }}
            onPasswordChange={(value) => {
              setForm((current) => ({ ...current, password: value }));
              if (error) {
                setError("");
              }
            }}
            onSubmit={submit}
            bottomBox={
              <p className="text-[13px] font-medium leading-5 text-slate-600">
                Need company access instead?{" "}
                <Link className="font-semibold text-[#2453d8] transition hover:text-[#1d47bd]" to="/login">
                  Go to workspace login
                </Link>
              </p>
            }
          />
        </main>
      </div>
      <footer className="border-t border-slate-200 bg-white/70 py-4 text-center text-xs font-medium text-slate-500">
        © 2026 Bizio Technologies. All rights reserved.
      </footer>
    </div>
  );
};
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnalyticsShowcase } from "../components/login/AnalyticsShowcase";
import { LoginCard } from "../components/login/LoginCard";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";
import { getApiErrorMessage } from "../lib/errors";

const PUBLIC_APP_TITLE = "Bizio Technologies Pvt. Ltd.";

export const LoginPage = () => {
  const { auth, sessionType, permissions, firstAccessibleRoute, login, platform } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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

  const submit = async () => {
    try {
      setLoading(true);
      setError("");
      clearMessage();
      const firstRoute = await login(form);
      navigate(firstRoute ?? "/no-menu", { replace: true });
    } catch (err: any) {
      const message = getApiErrorMessage(err, "Unable to sign in. Please check your email and password.");
      setError(message);
      setApiError(err, "Unable to sign in. Please check your email and password.");
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
          />
        </main>
      </div>
      <footer className="border-t border-slate-200 bg-white/70 py-4 text-center text-xs font-medium text-slate-500">
        © 2026 Bizio Technologies. All rights reserved.
      </footer>
    </div>
  );
};
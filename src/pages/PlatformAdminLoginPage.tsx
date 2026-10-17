import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LoginCard } from "../components/login/LoginCard";
import { LoginShell } from "../components/login/LoginShell";
import { PUBLIC_APP_TITLE } from "../config/site";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";

export const PlatformAdminLoginPage = () => {
  const { loginPlatformAdmin, platform } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { clearMessage, setApiError } = useApiMessage();
  const canSubmit = Boolean(form.username.trim() && form.password.trim());
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/platform-admin/dashboard";

  useEffect(() => {
    document.title = `Platform Admin Login | ${platform.platformName || PUBLIC_APP_TITLE}`;
  }, [platform.platformName]);

  const submit = async () => {
    try {
      setLoading(true);
      clearMessage();
      const nextRoute = await loginPlatformAdmin(form);
      navigate(from.startsWith("/platform-admin") ? from : nextRoute, { replace: true });
    } catch (err: any) {
      setApiError(err, "Unable to sign in as platform admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginShell>
      <LoginCard
        username={form.username}
        password={form.password}
        loading={loading}
        canSubmit={canSubmit}
        title="Platform Admin Sign in"
        subtitle="Sign in to manage companies and platform settings from a separate protected session."
        fieldLabel="Username"
        inputType="text"
        showForgotPassword={false}
        onUsernameChange={(value) => {
          setForm((current) => ({ ...current, username: value }));
        }}
        onPasswordChange={(value) => {
          setForm((current) => ({ ...current, password: value }));
        }}
        onSubmit={submit}
      />
    </LoginShell>
  );
};
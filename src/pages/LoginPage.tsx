import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/apiClient";
import { AnalyticsShowcase } from "../components/login/AnalyticsShowcase";
import { LoginCard } from "../components/login/LoginCard";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";
import { getApiErrorMessage } from "../lib/errors";
import { isMaintenanceError, isTenantSubdomainHost, notifyMaintenance } from "../lib/tenantMaintenance";
import type { ApiResponse } from "../types/api";

const PUBLIC_APP_TITLE = "Bizio Technologies Pvt. Ltd.";

function getSubdomainCompany(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname.toLowerCase();
  if (host === "biziotechnologies.com" || host === "www.biziotechnologies.com" || host === "localhost" || host === "127.0.0.1") return null;
  if (host.endsWith(".biziotechnologies.com")) {
    const sub = host.split(".")[0];
    if (sub && sub !== "www" && sub !== "biziotechnologies") return sub;
  }
  if (host.endsWith(".localhost")) {
    const sub = host.split(".")[0];
    if (sub && sub !== "localhost") return sub;
  }
  return null;
}

type LoginCompany = {
  name?: string | null;
  logoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
} | null;

type CompanyBranding = {
  name?: string | null;
  logoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
};

export const LoginPage = () => {
  const { auth, sessionType, permissions, firstAccessibleRoute, login, platform } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [company, setCompany] = useState<LoginCompany>(null);
  const [brandingReady, setBrandingReady] = useState(false);
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
    document.title = `Login | ${company?.name || platform.platformName || PUBLIC_APP_TITLE}`;
  }, [company?.name, platform.platformName]);

  useEffect(() => {
    let cancelled = false;
    const companyCode = getSubdomainCompany();
    // X-Company-Code header is attached automatically by the apiClient
    // interceptor from the frontend subdomain (same helper logic).
    // 1) Subdomain validation: unknown subdomain -> main site (existing behavior).
    if (companyCode) {
      apiClient
        .get<ApiResponse<CompanyBranding>>("/v1/company/by-domain", {
          params: { domain: window.location.hostname }
        })
        .catch((err) => {
          if (!cancelled && isMaintenanceError(err) && isTenantSubdomainHost()) {
            // Same URL, no navigation: App swaps in the maintenance screen.
            notifyMaintenance();
          } else if (!cancelled && err?.response?.status === 404) {
            const host = window.location.hostname.toLowerCase();
            // Unknown live subdomain -> main site. Local dev (*.localhost)
            // never redirects: an empty dev database also answers 404 here.
            if (!host.endsWith(".localhost")) {
              window.location.href = "https://biziotechnologies.com";
            }
          }
        });
    }
    // 2) Current tenant details for the login branding (subdomain AND plain localhost).
    apiClient
      .get<ApiResponse<CompanyBranding>>("/v1/company/current")
      .then((res) => {
        const info = res.data?.data;
        if (!cancelled && info && info.name) {
          setCompany({ name: info.name, logoUrl: info.logoUrl ?? null, email: info.email ?? null, phone: info.phone ?? null });
        } else if (!cancelled) {
          console.warn("Login company branding unavailable: /v1/company/current returned no company");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          if (isMaintenanceError(err) && isTenantSubdomainHost()) {
            notifyMaintenance();
          } else {
            console.warn("Login company branding unavailable:", err?.response?.status ?? err?.message ?? err);
          }
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBrandingReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        <AnalyticsShowcase companyName={brandingReady ? company?.name ?? null : null} />
        <main className="relative flex items-center justify-center px-4 py-10 sm:px-8 lg:py-12">
          <LoginCard
            username={form.username}
            password={form.password}
            loading={loading}
            canSubmit={canSubmit}
            error={error}
            company={company}
            brandingReady={brandingReady}
            subtitle={company?.name ? `Sign in to continue to ${company.name}.` : undefined}
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
        {company?.name ? (
          <span>{company.name} <span className="text-slate-400">• Powered by Bizio Technologies</span></span>
        ) : (
          "© 2026 Bizio Technologies. All rights reserved."
        )}
      </footer>
    </div>
  );
};
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/apiClient";
import { AnalyticsShowcase } from "../components/login/AnalyticsShowcase";
import { LoginCard } from "../components/login/LoginCard";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";
import { getApiErrorMessage } from "../lib/errors";
import { currentHostname, getSubdomainCompanyCode, mainSiteHomeUrl } from "../lib/hosts";
import { isMaintenanceError, isTenantSubdomainHost, notifyMaintenance } from "../lib/tenantMaintenance";
import type { ApiResponse } from "../types/api";

const PUBLIC_APP_TITLE = "Bizio Technologies Pvt. Ltd.";

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
  const [byDomainMissing, setByDomainMissing] = useState(false);
  const [brandingMissing, setBrandingMissing] = useState(false);
  const { clearMessage, setApiError } = useApiMessage();
  const canSubmit = Boolean(form.username.trim() && form.password.trim());
  // Ghost-tenant guard: on a tenant subdomain where NEITHER probe finds the
  // workspace (unknown code — backend answers 404 instead of falling back to
  // the default DB), block sign-in so the user never logs into the wrong DB.
  const unknownWorkspace =
    isTenantSubdomainHost() && byDomainMissing && brandingMissing;
  const effectiveCanSubmit = unknownWorkspace ? false : canSubmit;
  const effectiveError = unknownWorkspace
    ? "This workspace was not found. Please check your subdomain."
    : error;

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
    const companyCode = getSubdomainCompanyCode();
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
            setByDomainMissing(true);
            // Unknown tenant subdomain -> own main site (live main site on
            // live, local landing on local). Safety net below (workspace
            // message + disabled sign-in) stays in case navigation is blocked.
            window.location.href = mainSiteHomeUrl(currentHostname());
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
          // No branding AND (see above) no by-domain row on a tenant subdomain
          // means ghost tenant — never show another DB's branding here.
          setBrandingMissing(true);
          console.warn("Login company branding unavailable: /v1/company/current returned no company");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          if (isMaintenanceError(err) && isTenantSubdomainHost()) {
            notifyMaintenance();
          } else {
            setBrandingMissing(true);
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
    // Defense in depth: even if the button is forced, never attempt login
    // for an unknown workspace (backend would 404 the ghost tenant anyway).
    if (unknownWorkspace) {
      return;
    }
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
            canSubmit={effectiveCanSubmit}
            error={effectiveError}
            company={company}
            brandingReady={brandingReady}
            // Forgot-password hidden for now (validation later) — 1 line revert to restore.
            showForgotPassword={false}
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
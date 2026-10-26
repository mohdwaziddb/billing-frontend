import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiClient } from "../api/apiClient";
import { PUBLIC_APP_TITLE } from "../config/site";
import { LoginCard } from "../components/login/LoginCard";
import { LoginShell } from "../components/login/LoginShell";
import { MfaChallengeCard } from "../components/login/MfaChallengeCard";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";
import { currentHostname, getSubdomainCompanyCode, isLiveHost, isMainHost, isTenantSubdomainHost } from "../lib/hosts";
import { isMaintenanceError, notifyInvalidUrl, notifyMaintenance } from "../lib/tenantMaintenance";
import { notificationService } from "../services/notificationService";
import type { ApiResponse } from "../types/api";

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
  const { auth, sessionType, permissions, firstAccessibleRoute, login, completeMfaLogin, platform } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // ProtectedRoute ne jis page se bheja, login ke baad wahin wapas (sirf
  // app ke andar ka path — "//evil.com" jaisa external redirect nahi).
  const fromPath = (() => {
    const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
    const path = from?.pathname ?? "";
    if (!path.startsWith("/") || path.startsWith("//") || path === "/" || path === "/login" || path === "/no-menu") {
      return null;
    }
    return path + (from?.search ?? "");
  })();
  // Double-click par do login request (dusri pehli ka refresh token mita deti thi).
  const submittingRef = useRef(false);
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  // MFA second step: password OK hua par TOTP pending hai. mfaToken sirf
  // memory me rehta hai — storage me kabhi nahi (5 min expiry).
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaAccountLabel, setMfaAccountLabel] = useState<string | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [company, setCompany] = useState<LoginCompany>(null);
  const [brandingReady, setBrandingReady] = useState(false);
  const [byDomainMissing, setByDomainMissing] = useState(false);
  const [brandingMissing, setBrandingMissing] = useState(false);
  const { clearMessage, setApiError } = useApiMessage();
  // Defense in depth (route guard lives in App.tsx): tenant login NEVER
  // renders on the live main host — local main hosts keep working for dev.
  const isLiveMainHost =
    typeof window !== "undefined" && isLiveHost(currentHostname()) && isMainHost(currentHostname());
  const canSubmit = Boolean(form.username.trim() && form.password.trim());
  // Ghost-tenant guard: on a tenant subdomain where NEITHER probe finds the
  // workspace (unknown code — backend answers 404 instead of falling back to
  // the default DB), block sign-in so the user never logs into the wrong DB.
  const unknownWorkspace =
    isTenantSubdomainHost() && byDomainMissing && brandingMissing;
  const effectiveCanSubmit = unknownWorkspace ? false : canSubmit;

  useEffect(() => {
    if (unknownWorkspace) {
      notificationService.showError("This workspace was not found. Please check your subdomain.");
    }
  }, [unknownWorkspace]);

  useEffect(() => {
    if (!auth?.accessToken) {
      return;
    }
    if (sessionType === "platform-admin") {
      navigate("/platform-admin/dashboard", { replace: true });
      return;
    }
    if (sessionType === "user" && permissions) {
      // submit() jaisa hi target: menu na ho to /no-menu (pehle /dashboard par
      // jaakar "permission denied" toast aata tha).
      navigate(fromPath ?? firstAccessibleRoute() ?? "/no-menu", { replace: true });
    }
  }, [auth?.accessToken, firstAccessibleRoute, fromPath, navigate, permissions, sessionType]);

  useEffect(() => {
    document.title = `Login | ${company?.name || platform.platformName || PUBLIC_APP_TITLE}`;
  }, [company?.name, platform.platformName]);

  useEffect(() => {
    let cancelled = false;
    const companyCode = getSubdomainCompanyCode();
    // X-Company-Code header is attached automatically by the apiClient
    // interceptor from the frontend subdomain (same helper logic).
    // 1) Subdomain validation: unknown subdomain -> branded Invalid URL screen.
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
            // Unknown tenant subdomain -> branded Invalid URL screen (App
            // event par same URL pe swap karta hai, redirect nahi). Safety net
            // — agar screen na aaye to blocked sign-in + message dikhega.
            notifyInvalidUrl();
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

  useEffect(() => {
    if (isLiveMainHost) {
      window.location.href = "/";
    }
  }, [isLiveMainHost]);

  if (isLiveMainHost) {
    return null;
  }

  const submit = async () => {
    // Defense in depth: even if the button is forced, never attempt login
    // for an unknown workspace (backend would 404 the ghost tenant anyway).
    if (unknownWorkspace || submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    try {
      setLoading(true);
      clearMessage();
      const result = await login(form);
      if (result.mfaRequired) {
        // Second step: code screen dikhao, session abhi save nahi hui.
        setMfaToken(result.mfaToken ?? null);
        setMfaAccountLabel(result.user?.username ?? result.user?.email ?? null);
        return;
      }
      navigate(result.route ? fromPath ?? result.route : "/no-menu", { replace: true });
    } catch (err: any) {
      setApiError(err, "Unable to sign in. Please check your email and password.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const submitMfa = async (code: string) => {
    if (!mfaToken) {
      notificationService.showError("MFA session expired. Please sign in again.");
      return;
    }
    try {
      setMfaLoading(true);
      clearMessage();
      const route = await completeMfaLogin(mfaToken, code);
      navigate(route ? fromPath ?? route : "/no-menu", { replace: true });
    } catch (err: any) {
      setApiError(err, "Incorrect code. Enter the 6-digit code from your authenticator app.");
      // MFA token 5 min ka hai: expire hone par code screen par atke rehne ki jagah password par wapas.
      if (/MFA session expired/i.test(String(err?.response?.data?.message ?? ""))) {
        setMfaToken(null);
        setMfaAccountLabel(null);
      }
    } finally {
      setMfaLoading(false);
    }
  };

  const backToPassword = () => {
    setMfaToken(null);
    setMfaAccountLabel(null);
  };

  return (
    <LoginShell
      company={company}
      brandingReady={brandingReady}
      footerNote={
        company?.name ? (
          <span>
            {company.name} <span className="text-slate-400">• Powered by Bizio Technologies</span>
          </span>
        ) : undefined
      }
    >
      {mfaToken ? (
        <MfaChallengeCard
          accountLabel={mfaAccountLabel}
          loading={mfaLoading}
          onSubmit={(code) => void submitMfa(code)}
          onBack={backToPassword}
        />
      ) : (
        <LoginCard
          username={form.username}
          password={form.password}
          loading={loading}
          canSubmit={effectiveCanSubmit}
          onUsernameChange={(value) => {
            setForm((current) => ({ ...current, username: value }));
          }}
          onPasswordChange={(value) => {
            setForm((current) => ({ ...current, password: value }));
          }}
          onSubmit={submit}
        />
      )}
    </LoginShell>
  );
};
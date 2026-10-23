import { CheckCircle2, Copy, ExternalLink, PlugZap, Save, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../../components/Button";
import { CommonBreadcrumb } from "../../../components/CommonBreadcrumb";
import { GlassCard } from "../../../components/GlassCard";
import { Header } from "../../../components/Header";
import { Input } from "../../../components/Input";
import { Select } from "../../../components/Select";
import { StatusBadge } from "../../../components/StatusBadge";
import { env } from "../../../config/env";
import { useAuth } from "../../../context/AuthContext";
import { useApiMessage } from "../../../hooks/useApiFeedback";
import { formatDateTime } from "../../../lib/format";
import { notificationService } from "../../../services/notificationService";
import {
  getPaymentGatewayProviders,
  getPaymentGatewaySettings,
  savePaymentGatewaySettings,
  testPaymentGatewaySettings
} from "../paymentGateway.api";
import type {
  PaymentGatewayHealth,
  PaymentGatewayMetadata,
  PaymentGatewaySetting,
  PaymentGatewaySettingRequest
} from "../payment.types";

type FormState = {
  testMode: boolean;
  active: boolean;
  config: Record<string, string>;
};

const emptyForm: FormState = { testMode: true, active: false, config: {} };

const absoluteApiUrl = (path: string) => {
  const base = env.apiBaseUrl.startsWith("http") ? env.apiBaseUrl : `${window.location.origin}${env.apiBaseUrl}`;
  return `${base.replace(/\/$/, "")}${path}`;
};

/**
 * Company-wise payment gateway setup. Form gateway metadata se banta hai,
 * isliye naye gateway ke liye yahan code nahi badalna padta.
 */
export const PaymentGatewaySettingsPage = () => {
  const { can } = useAuth();
  const canEdit = can("PAYMENT_GATEWAY", "EDIT");
  const { setApiError } = useApiMessage();
  const [providers, setProviders] = useState<PaymentGatewayMetadata[]>([]);
  const [settings, setSettings] = useState<PaymentGatewaySetting[]>([]);
  const [gatewayType, setGatewayType] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [health, setHealth] = useState<PaymentGatewayHealth | null>(null);

  useEffect(() => {
    void Promise.all([getPaymentGatewayProviders(), getPaymentGatewaySettings()])
      .then(([providerData, settingData]) => {
        setProviders(providerData);
        setSettings(settingData);
        const initial = settingData.find((item) => item.defaultGateway) ?? settingData[0];
        setGatewayType(initial?.gatewayType ?? providerData[0]?.gatewayType ?? "");
      })
      .catch((error) => setApiError(error, "Unable to load payment gateway settings"));
  }, [setApiError]);

  const provider = providers.find((item) => item.gatewayType === gatewayType);
  const saved = settings.find((item) => item.gatewayType === gatewayType);

  useEffect(() => {
    setHealth(null);
    setForm(saved ? { testMode: saved.testMode, active: saved.active, config: { ...saved.config } } : emptyForm);
  }, [saved, gatewayType]);

  const missingRequired = useMemo(
    () => (provider?.fields ?? []).filter((field) => field.required && !(form.config[field.key] || "").trim()),
    [form.config, provider]
  );

  const buildPayload = (overrides?: Partial<PaymentGatewaySettingRequest>): PaymentGatewaySettingRequest => ({
    gatewayType,
    testMode: form.testMode,
    active: form.active,
    defaultGateway: true,
    config: form.config,
    ...overrides
  });

  const handleSave = async () => {
    if (form.active && missingRequired.length > 0) {
      notificationService.showError(`${missingRequired[0].label} is required`);
      return;
    }
    setSaving(true);
    try {
      const next = await savePaymentGatewaySettings(buildPayload());
      setSettings((current) => [...current.filter((item) => item.gatewayType !== next.gatewayType), next]);
      notificationService.showSuccess(next.active ? `${provider?.gatewayName ?? "Gateway"} enabled for online payments` : "Payment gateway settings saved");
    } catch (error) {
      setApiError(error, "Unable to save payment gateway settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setHealth(null);
    try {
      setHealth(await testPaymentGatewaySettings(buildPayload()));
    } catch (error) {
      setApiError(error, "Unable to test connection");
    } finally {
      setTesting(false);
    }
  };

  const webhookUrl = saved ? absoluteApiUrl(saved.webhookUrl) : "";
  const webhookLooksLocal = /localhost|127\.0\.0\.1/.test(webhookUrl);

  const copyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      notificationService.showSuccess("Webhook URL copied");
    } catch {
      notificationService.showError("Unable to copy. Select the URL and copy manually.");
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <Header title="Payment Gateway" subtitle="Accept online payments (UPI, cards, netbanking) on invoices with your own gateway account." />

      <GlassCard className="p-6 md:p-7">
        <div className="flex flex-col gap-5">
          <CommonBreadcrumb items={[{ label: "Setup" }, { label: "Payment Gateway" }]} />

          <div className="grid gap-4 md:grid-cols-3">
            <Select
              label="Gateway"
              placeholder={null}
              value={gatewayType}
              options={providers.map((item) => ({ label: item.gatewayName, value: item.gatewayType }))}
              onChange={(event) => setGatewayType(event.target.value)}
            />
            <Select
              label="Mode"
              placeholder={null}
              value={form.testMode ? "true" : "false"}
              disabled={!canEdit}
              hint="Use test keys first. Switch to live after a successful test payment."
              options={[{ label: "Test", value: "true" }, { label: "Live", value: "false" }]}
              onChange={(event) => setForm((current) => ({ ...current, testMode: event.target.value === "true" }))}
            />
            <Select
              label="Online Payments"
              placeholder={null}
              value={form.active ? "true" : "false"}
              disabled={!canEdit}
              hint="When enabled, 'Online' appears as a payment mode on invoices and payments."
              options={[{ label: "Disabled", value: "false" }, { label: "Enabled", value: "true" }]}
              onChange={(event) => setForm((current) => ({ ...current, active: event.target.value === "true" }))}
            />
          </div>

          {provider?.description ? <p className="text-sm text-slate-500">{provider.description}</p> : null}

          <div className="grid gap-4 md:grid-cols-2">
            {(provider?.fields ?? []).map((field) => (
              <Input
                key={field.key}
                label={field.label}
                requiredMark={field.required}
                type={field.sensitive ? "password" : "text"}
                autoComplete="off"
                placeholder={field.placeholder ?? undefined}
                hint={field.helpText ?? undefined}
                disabled={!canEdit}
                value={form.config[field.key] ?? ""}
                onChange={(event) => setForm((current) => ({ ...current, config: { ...current.config, [field.key]: event.target.value } }))}
              />
            ))}
          </div>

          {health ? (
            <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${health.success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
              {health.success ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              {health.message}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <StatusBadge label={saved?.active ? "Active" : "Inactive"} />
              {saved?.updatedAt ? <span>Updated {formatDateTime(saved.updatedAt)}{saved.updatedBy ? ` by ${saved.updatedBy}` : ""}</span> : <span>Not configured yet</span>}
            </div>
            {canEdit ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={handleTest} disabled={testing || !gatewayType || missingRequired.length > 0}>
                  <PlugZap size={16} />
                  {testing ? "Testing…" : "Test Connection"}
                </Button>
                <Button type="button" onClick={handleSave} disabled={saving || !gatewayType}>
                  <Save size={16} />
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </GlassCard>

      {saved && provider ? (
        <GlassCard className="p-6 md:p-7">
          <h3 className="fs-18 font-bold text-slate-950">Webhook setup</h3>
          <p className="mt-1 text-sm text-slate-500">
            Webhooks confirm payments automatically, even if the customer closes the page. Payments are also re-checked every few minutes.
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>
              Open {provider.gatewayName} Dashboard → Webhooks → Add New Webhook
              {provider.dashboardUrl ? (
                <a href={provider.dashboardUrl} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 font-semibold text-[color:var(--theme-color)]">
                  Open dashboard <ExternalLink size={13} />
                </a>
              ) : null}
            </li>
            <li>Paste this Webhook URL:</li>
          </ol>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <code className="min-w-0 flex-1 break-all text-xs text-slate-800">{webhookUrl}</code>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Copy webhook URL" onClick={copyWebhook}>
              <Copy size={16} />
            </Button>
          </div>
          {webhookLooksLocal ? (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 fs-12 text-amber-800">
              This is a local URL; the gateway cannot reach it. For local testing use a tunnel (e.g. ngrok) URL. Status checks still work without webhooks.
            </p>
          ) : null}
          <ol start={3} className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>Set a Secret and enter exactly the same value in "Webhook Secret" above, then Save.</li>
            <li>
              Select events: <span className="font-semibold">{provider.webhookEvents.join(", ")}</span>
            </li>
          </ol>
        </GlassCard>
      ) : null}
    </div>
  );
};

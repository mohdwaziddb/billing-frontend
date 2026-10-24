import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Edit3, History, Mail, MessageCircle, MessageSquare, Plus, Send } from "lucide-react";
import {
  createEmailSettings,
  createSmsSettings,
  createWhatsAppSettings,
  getEmailSettings,
  getSmsProviders,
  getSmsSettings,
  getWhatsAppProviders,
  getWhatsAppSettings,
  sendTestEmail,
  sendTestSms,
  sendTestWhatsApp,
  updateEmailSettings,
  updateSmsSettings,
  updateWhatsAppSettings
} from "../api/notifications";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { Select } from "../components/Select";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";
import { providerLabel } from "../lib/providerLabel";
import { notificationService } from "../services/notificationService";
import type { ProviderSettings, ProviderSettingsRequest, SmsProviderMetadata, WhatsAppProviderMetadata } from "../types/api";

type CommunicationTab = "email" | "sms" | "whatsapp";

const emailDefaults: ProviderSettingsRequest = {
  providerName: "GMAIL_SMTP",
  senderEmail: "",
  smtpHost: "smtp.gmail.com",
  smtpPort: 587,
  smtpUsername: "",
  smtpPassword: "",
  smtpTlsEnabled: true,
  awsAccessKey: "",
  awsSecretKey: "",
  awsRegion: "ap-south-1",
  sendgridApiKey: "",
  active: true
};

const smsDefaults: ProviderSettingsRequest = {
  providerName: "MSG91",
  providerType: "MSG91",
  apiUrl: "https://api.msg91.com/api/v2/sendsms",
  configValues: {
    apiUrl: "https://api.msg91.com/api/v2/sendsms",
    authKey: "",
    senderId: "",
    templateId: ""
  },
  active: true
};

const whatsAppDefaults: ProviderSettingsRequest = {
  providerName: "",
  providerType: "",
  apiUrl: "",
  configValues: {},
  active: true
};

const tabMeta: Record<CommunicationTab, { label: string; providerLabel: string; mode: string; defaults: ProviderSettingsRequest }> = {
  email: { label: "Email Services", providerLabel: "Email Provider", mode: "Email Delivery", defaults: emailDefaults },
  sms: { label: "SMS Services", providerLabel: "SMS Provider", mode: "SMS Delivery", defaults: smsDefaults },
  whatsapp: { label: "WhatsApp Services", providerLabel: "WhatsApp Provider", mode: "WhatsApp Messaging", defaults: whatsAppDefaults }
};

const CHANNELS: Array<{ value: CommunicationTab; label: string; icon: typeof Mail; historyRoute: string; historyMenu: string }> = [
  { value: "email", label: "Email", icon: Mail, historyRoute: "/communication-history/mail", historyMenu: "MAIL_HISTORY" },
  { value: "sms", label: "SMS", icon: MessageSquare, historyRoute: "/communication-history/sms", historyMenu: "SMS_HISTORY" },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle, historyRoute: "/communication-history/whatsapp", historyMenu: "WHATSAPP_HISTORY" }
];

const loadChannelSettings = (channel: CommunicationTab) =>
  channel === "email" ? getEmailSettings() : channel === "sms" ? getSmsSettings() : getWhatsAppSettings();

export const CommunicationSettingsPage = () => <CommunicationHubPage />;

const CommunicationHubPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<CommunicationTab>(normalizeTab(searchParams.get("tab")));
  const [records, setRecords] = useState<ProviderSettings[]>([]);
  const [channelSummary, setChannelSummary] = useState<Partial<Record<CommunicationTab, ProviderSettings[]>>>({});
  const [editing, setEditing] = useState<ProviderSettings | null>(null);
  const [form, setForm] = useState<ProviderSettingsRequest>({ ...tabMeta[tab].defaults });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testingDraft, setTestingDraft] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");
  const [testMobileNumber, setTestMobileNumber] = useState("");
  const [testMessage, setTestMessage] = useState("This is a test WhatsApp message from your active provider.");
  const [smsProviders, setSmsProviders] = useState<SmsProviderMetadata[]>([]);
  const [whatsAppProviders, setWhatsAppProviders] = useState<WhatsAppProviderMetadata[]>([]);
  const { setApiError } = useApiMessage();
  // Backend: provider add = COMMUNICATION:ADD, edit/test = COMMUNICATION:EDIT — bina permission button mat dikhao.
  const { can } = useAuth();
  const canAddProvider = can("COMMUNICATION", "ADD");
  const canEditProvider = can("COMMUNICATION", "EDIT");

  useEffect(() => {
    setTab(normalizeTab(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    setForm(
      tab === "sms"
        ? applySmsProviderDefaults({ ...tabMeta[tab].defaults }, smsProviders[0] ?? null)
        : tab === "whatsapp"
          ? applyWhatsAppProviderDefaults({ ...tabMeta[tab].defaults }, whatsAppProviders[0] ?? null)
          : { ...tabMeta[tab].defaults }
    );
    setEditing(null);
    setOpen(false);
  }, [smsProviders, tab, whatsAppProviders]);

  useEffect(() => {
    if (tab !== "sms") {
      return;
    }
    const loadProviders = async () => {
      try {
        setSmsProviders(await getSmsProviders());
      } catch (error) {
        setApiError(error, "Unable to load SMS providers");
      }
    };
    void loadProviders();
  }, [setApiError, tab]);

  useEffect(() => {
    if (tab !== "whatsapp") {
      return;
    }
    const loadProviders = async () => {
      try {
        setWhatsAppProviders(await getWhatsAppProviders());
      } catch (error) {
        setApiError(error, "Unable to load WhatsApp providers");
      }
    };
    void loadProviders();
  }, [setApiError, tab]);

  const refresh = async () => {
    try {
      const rows = await loadChannelSettings(tab);
      setRecords(rows);
      setChannelSummary((current) => ({ ...current, [tab]: rows }));
    } catch (error) {
      setApiError(error, `Unable to load ${tabMeta[tab].label.toLowerCase()}`);
    }
  };

  // Teeno channel cards par "active / not set up" dikhane ke liye ek baar sab load.
  useEffect(() => {
    CHANNELS.forEach(({ value }) => {
      void loadChannelSettings(value)
        .then((rows) => setChannelSummary((current) => ({ ...current, [value]: rows })))
        .catch(() => setChannelSummary((current) => ({ ...current, [value]: [] })));
    });
  }, []);

  useEffect(() => {
    void refresh();
  }, [tab]);

  const switchTab = (nextTab: CommunicationTab) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", nextTab);
    setSearchParams(params, { replace: true });
  };

  const startCreate = () => {
    setEditing(null);
    setForm(
      tab === "sms"
        ? applySmsProviderDefaults({ ...tabMeta[tab].defaults }, smsProviders[0] ?? null)
        : tab === "whatsapp"
          ? applyWhatsAppProviderDefaults({ ...tabMeta[tab].defaults }, whatsAppProviders[0] ?? null)
          : { ...tabMeta[tab].defaults }
    );
    setOpen(true);
  };

  const startEdit = (record: ProviderSettings) => {
    setEditing(record);
    setForm(buildProviderForm(record, smsProviders, whatsAppProviders));
    setOpen(true);
  };

  const resetForm = () => {
    setForm(
      editing
        ? buildProviderForm(editing, smsProviders, whatsAppProviders)
        : tab === "sms"
          ? applySmsProviderDefaults({ ...tabMeta[tab].defaults }, smsProviders[0] ?? null)
          : tab === "whatsapp"
            ? applyWhatsAppProviderDefaults({ ...tabMeta[tab].defaults }, whatsAppProviders[0] ?? null)
            : { ...tabMeta[tab].defaults }
    );
  };

  const save = async () => {
    try {
      setSaving(true);
      if (tab === "email") {
        await saveEmailProvider(editing, form);
      } else if (tab === "sms") {
        await saveSmsProvider(editing, normalizeSmsForm(form));
      } else {
        await saveWhatsAppProvider(editing, normalizeWhatsAppForm(form));
      }
      notificationService.showSuccess(`${tabMeta[tab].label} saved successfully.`);
      setOpen(false);
      await refresh();
    } catch (error) {
      setApiError(error, `Unable to save ${tabMeta[tab].label.toLowerCase()}`);
    } finally {
      setSaving(false);
    }
  };

  const testProvider = async (record: ProviderSettings) => {
    try {
      setTestingId(record.id);
      if (tab === "email") {
        await sendTestEmail(testRecipient);
        notificationService.showSuccess("Test email sent successfully.");
      } else if (tab === "sms") {
        await sendTestSms({ mobileNumber: testMobileNumber });
        notificationService.showSuccess("Test SMS sent successfully.");
      } else {
        await sendTestWhatsApp({ mobileNumber: testMobileNumber, message: testMessage });
        notificationService.showSuccess("WhatsApp message sent successfully.");
      }
    } catch (error) {
      setApiError(error, `Unable to send test ${tab === "email" ? "email" : tab === "sms" ? "SMS" : "WhatsApp message"}`);
    } finally {
      setTestingId(null);
    }
  };

  const emailProvider = normalizeEmailProvider(form.providerName);
  const selectedSmsProvider = useMemo(
    () => smsProviders.find((provider) => provider.providerType === form.providerType) ?? null,
    [form.providerType, smsProviders]
  );
  const selectedWhatsAppProvider = useMemo(
    () => whatsAppProviders.find((provider) => provider.providerType === form.providerType) ?? null,
    [form.providerType, whatsAppProviders]
  );

  const canSaveProvider = tab === "email"
    ? emailProvider === "AWS_SES"
      ? Boolean(form.senderEmail?.trim() && form.awsAccessKey?.trim() && (editing || form.awsSecretKey?.trim()) && form.awsRegion?.trim())
      : emailProvider === "SENDGRID"
        ? Boolean(form.senderEmail?.trim() && (editing || form.sendgridApiKey?.trim()))
        : Boolean(form.senderEmail?.trim() && form.smtpHost?.trim() && form.smtpPort && form.smtpUsername?.trim() && (editing || form.smtpPassword?.trim()))
    : tab === "sms"
      ? canSaveSmsProvider(form, smsProviders, Boolean(editing))
      : canSaveWhatsAppProvider(form, whatsAppProviders, Boolean(editing));

  const activeRecord = records.find((record) => record.active) ?? null;
  const channel = CHANNELS.find((item) => item.value === tab) ?? CHANNELS[0];
  const ChannelIcon = channel.icon;
  const testLabel = tab === "email" ? "Send test email" : tab === "sms" ? "Send test SMS" : "Send test message";

  return (
    <div className="space-y-4 pb-6">
      <Header
        title="Communication Services"
        subtitle="Connect the email, SMS and WhatsApp accounts your invoices, reminders and OTPs are sent from."
      />

      <GlassCard className="p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CommonBreadcrumb items={[{ label: "Setup" }, { label: "Communication" }]} />
          {can(channel.historyMenu, "VIEW") ? (
            <Link to={channel.historyRoute} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--theme-color)] hover:underline">
              <History size={15} /> View {channel.label} history
            </Link>
          ) : null}
        </div>

        {/* Channel cards: har channel ka haal ek nazar me (kaun sa provider active hai). */}
        <div className="mt-4 grid gap-3 md:grid-cols-3" role="tablist" aria-label="Communication channel">
          {CHANNELS.map((item) => {
            const Icon = item.icon;
            const selected = item.value === tab;
            const summary = channelSummary[item.value];
            const activeName = summary?.find((record) => record.active)?.providerName;
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => switchTab(item.value)}
                className={clsx(
                  "flex items-center gap-3 rounded-2xl border p-4 text-left transition",
                  selected
                    ? "border-[var(--theme-color)] bg-[color:color-mix(in_srgb,var(--theme-color)_6%,white)] shadow-[0_10px_30px_-14px_color-mix(in_srgb,var(--theme-color)_50%,transparent)]"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                )}
              >
                <span
                  className={clsx(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                    selected ? "bg-[var(--theme-color)] text-[var(--theme-contrast)]" : "bg-slate-100 text-slate-600"
                  )}
                >
                  <Icon size={20} />
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-bold text-slate-900">{item.label}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs font-medium">
                    <span className={clsx("h-2 w-2 shrink-0 rounded-full", summary === undefined ? "bg-slate-300" : activeName ? "bg-emerald-500" : "bg-amber-400")} />
                    <span className={clsx("truncate", activeName ? "text-slate-600" : "text-slate-400")}>
                      {summary === undefined ? "Checking…" : activeName ? `${providerLabel(activeName)} · active` : "Not set up"}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Active provider + test send */}
        {activeRecord ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[color:color-mix(in_srgb,var(--theme-color)_12%,white)] text-[var(--theme-color)]">
                    <ChannelIcon size={22} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Active {channel.label} provider</p>
                    <p className="truncate text-xl font-bold text-slate-950">{providerLabel(activeRecord.providerName)}</p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 size={14} /> Active
                </span>
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <ProviderFact label={tab === "email" ? "Sends from" : tab === "sms" ? "Sender ID" : "WhatsApp number"} value={senderOf(activeRecord, tab)} />
                <ProviderFact label={tab === "email" ? "Server" : "API URL"} value={tab === "email" ? emailEndpoint(activeRecord) : activeRecord.apiUrl ?? "--"} />
                <ProviderFact label={tab === "whatsapp" ? "Account" : "Login / key"} value={tab === "email" ? emailCredential(activeRecord) : tab === "sms" ? resolveSmsCredential(activeRecord) : resolveWhatsAppCredential(activeRecord)} />
                <ProviderFact label="Used for" value={tab === "email" ? "Invoices, reminders, password OTP" : tab === "sms" ? "Reminders and alerts" : "Invoice and payment messages"} />
              </dl>
            </div>

            {canEditProvider ? (
              <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
                <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Send size={16} className="text-[var(--theme-color)]" /> Send a test
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {tab === "email"
                    ? "Check that mails really go out. Some servers accept a mail and bounce it later — look in the sender mailbox too."
                    : "Check that messages really reach the phone."}
                </p>
                <div className="mt-3 space-y-3">
                  {tab === "email" ? (
                    <Input label="Send to" type="email" value={testRecipient} onChange={(event) => setTestRecipient(event.target.value)} placeholder="Company email (default)" />
                  ) : (
                    <Input label="Send to" inputMode="tel" value={testMobileNumber} onChange={(event) => setTestMobileNumber(event.target.value)} placeholder="Company phone (default)" />
                  )}
                  {tab === "whatsapp" ? (
                    <label className="block space-y-2">
                      <span className="block fs-12 font-semibold text-slate-700">Message</span>
                      <textarea
                        className="min-h-[84px] w-full rounded-[var(--radius-control)] border border-slate-200 bg-white px-3.5 py-2.5 fs-13 text-slate-900 outline-none transition focus:border-[var(--theme-color)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_14%,transparent)]"
                        value={testMessage}
                        onChange={(event) => setTestMessage(event.target.value)}
                      />
                    </label>
                  ) : null}
                </div>
                <Button type="button" className="mt-4 w-full" disabled={testingId === activeRecord.id} onClick={() => void testProvider(activeRecord)}>
                  <Send size={15} /> {testingId === activeRecord.id ? "Sending…" : testLabel}
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[var(--theme-color)] shadow-sm ring-1 ring-slate-200">
              <ChannelIcon size={26} />
            </span>
            <div>
              <p className="text-base font-bold text-slate-900">
                {records.length ? `No ${channel.label} provider is active` : `Connect your ${channel.label} provider`}
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                {records.length
                  ? `Activate one of the providers below — until then ${channel.label.toLowerCase()} messages cannot be sent.`
                  : `Add your ${channel.label.toLowerCase()} account so invoices, reminders and alerts can be sent automatically.`}
              </p>
            </div>
            {canAddProvider && !records.length ? (
              <Button type="button" onClick={startCreate}>
                <Plus size={16} /> Add {channel.label} Provider
              </Button>
            ) : null}
          </div>
        )}

        {records.length ? (
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">All {channel.label} providers</h3>
                <p className="text-xs text-slate-500">Only one provider is active at a time — that one sends every {channel.label.toLowerCase()}.</p>
              </div>
              {canAddProvider ? (
                <Button type="button" variant="secondary" onClick={startCreate}>
                  <Plus size={16} /> Add Provider
                </Button>
              ) : null}
            </div>
            <Table
              data={records}
              emptyText={`No ${tabMeta[tab].label.toLowerCase()} found.`}
              columns={[
                {
                  key: "provider",
                  header: "Provider",
                  render: (record) => (
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:color-mix(in_srgb,var(--theme-color)_10%,white)] text-[var(--theme-color)]">
                        <ChannelIcon size={18} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-950">{providerLabel(record.providerName)}</p>
                        <p className="truncate text-xs text-slate-500">{senderOf(record, tab)}</p>
                      </div>
                    </div>
                  )
                },
                {
                  key: "endpoint",
                  header: tab === "email" ? "Server" : "API URL",
                  render: (record) => <span className="break-all text-slate-700">{tab === "email" ? emailEndpoint(record) : record.apiUrl ?? "--"}</span>
                },
                {
                  key: "credentials",
                  header: tab === "whatsapp" ? "Account" : "Login / key",
                  render: (record) => <span className="text-slate-700">{tab === "email" ? emailCredential(record) : tab === "sms" ? resolveSmsCredential(record) : resolveWhatsAppCredential(record)}</span>
                },
                { key: "status", header: "Status", render: (record) => <StatusBadge label={record.active ? "ACTIVE" : "INACTIVE"} /> },
                {
                  key: "actions",
                  header: "Actions",
                  className: "text-right",
                  render: (record) => (
                    <div className="flex justify-end gap-2">
                      {canEditProvider ? (
                        <Button type="button" variant="secondary" onClick={() => startEdit(record)}>
                          <Edit3 size={15} /> Edit
                        </Button>
                      ) : null}
                    </div>
                  )
                }
              ]}
            />
          </div>
        ) : null}
      </GlassCard>

      <Modal open={open} eyebrow={tabMeta[tab].label} title={editing ? `Edit ${tabMeta[tab].providerLabel}` : `Add ${tabMeta[tab].providerLabel}`} onClose={() => setOpen(false)} maxWidthClass="max-w-4xl">
        <div className="grid gap-4 md:grid-cols-2">
          {tab === "email" ? (
            <Select
              label="Provider Type"
              value={emailProvider}
              options={[
                { label: "Gmail SMTP", value: "GMAIL_SMTP" },
                { label: "Amazon SES", value: "AWS_SES" },
                { label: "SendGrid", value: "SENDGRID" }
              ]}
              onChange={(event) => setForm((current) => providerDefaults(event.target.value, current))}
            />
          ) : tab === "sms" ? (
            <>
              <Input label="Provider Name" value={form.providerName ?? ""} onChange={(event) => setForm((current) => ({ ...current, providerName: event.target.value }))} />
              <Select
                label="Provider"
                value={form.providerType ?? ""}
                options={smsProviders.map((provider) => ({ label: provider.providerName, value: provider.providerType }))}
                onChange={(event) => setForm((current) => applySmsProviderDefaults(current, smsProviders.find((provider) => provider.providerType === event.target.value) ?? null))}
              />
            </>
          ) : (
            <>
              <Input label="Provider Name" value={form.providerName ?? ""} onChange={(event) => setForm((current) => ({ ...current, providerName: event.target.value }))} />
              <Select
                label="Provider Type"
                value={form.providerType ?? ""}
                options={whatsAppProviders.map((provider) => ({ label: provider.providerName, value: provider.providerType }))}
                onChange={(event) => setForm((current) => applyWhatsAppProviderDefaults(current, whatsAppProviders.find((provider) => provider.providerType === event.target.value) ?? null))}
              />
            </>
          )}

          {tab === "email" ? (
            <>
              <Input label="Sender Email" value={form.senderEmail ?? ""} onChange={(event) => setForm((current) => ({ ...current, senderEmail: event.target.value }))} />
              {emailProvider === "GMAIL_SMTP" ? (
                <>
                  <Input label="SMTP Host" value={form.smtpHost ?? ""} onChange={(event) => setForm((current) => ({ ...current, smtpHost: event.target.value }))} />
                  <Input label="SMTP Port" type="number" value={form.smtpPort ?? 587} onChange={(event) => setForm((current) => ({ ...current, smtpPort: Number(event.target.value) || 587 }))} />
                  <Input label="SMTP Username" value={form.smtpUsername ?? ""} onChange={(event) => setForm((current) => ({ ...current, smtpUsername: event.target.value }))} />
                  <Input label="SMTP Password" type="password" placeholder={editing ? "Leave blank to keep existing password" : "Gmail app password"} value={form.smtpPassword ?? ""} onChange={(event) => setForm((current) => ({ ...current, smtpPassword: event.target.value }))} />
                  <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 md:col-span-2">
                    <input type="checkbox" checked={form.smtpTlsEnabled ?? true} onChange={(event) => setForm((current) => ({ ...current, smtpTlsEnabled: event.target.checked }))} />
                    Enable TLS
                  </label>
                </>
              ) : emailProvider === "SENDGRID" ? (
                <Input label="API Key" type="password" placeholder={editing ? "Leave blank to keep existing API key" : ""} value={form.sendgridApiKey ?? ""} onChange={(event) => setForm((current) => ({ ...current, sendgridApiKey: event.target.value }))} />
              ) : (
                <>
                  <Input label="AWS Access Key" value={form.awsAccessKey ?? ""} onChange={(event) => setForm((current) => ({ ...current, awsAccessKey: event.target.value }))} />
                  <Input label="AWS Secret Key" type="password" placeholder={editing ? "Leave blank to keep existing secret" : ""} value={form.awsSecretKey ?? ""} onChange={(event) => setForm((current) => ({ ...current, awsSecretKey: event.target.value }))} />
                  <Input label="AWS Region" value={form.awsRegion ?? ""} onChange={(event) => setForm((current) => ({ ...current, awsRegion: event.target.value }))} />
                </>
              )}
            </>
          ) : tab === "sms" ? (
            <>
              {selectedSmsProvider?.fields.map((field) => (
                field.type === "boolean" ? (
                  <label key={field.key} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 md:col-span-2">
                    <input
                      type="checkbox"
                      checked={String(form.configValues?.[field.key] ?? field.defaultValue ?? "false") === "true"}
                      onChange={(event) => setForm((current) => ({ ...current, configValues: { ...(current.configValues ?? {}), [field.key]: event.target.checked ? "true" : "false" } }))}
                    />
                    {field.label}
                  </label>
                ) : (
                  <Input
                    key={field.key}
                    label={field.label}
                    type={field.sensitive ? "password" : field.type === "url" ? "url" : "text"}
                    placeholder={field.sensitive && editing ? "Leave blank to keep existing value" : field.placeholder ?? ""}
                    value={form.configValues?.[field.key] ?? field.defaultValue ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, configValues: { ...(current.configValues ?? {}), [field.key]: event.target.value } }))}
                    hint={field.helpText ?? undefined}
                    requiredMark={field.required}
                  />
                )
              ))}
            </>
          ) : (
            <>
              {selectedWhatsAppProvider?.fields.map((field) => (
                field.type === "boolean" ? (
                  <label key={field.key} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 md:col-span-2">
                    <input
                      type="checkbox"
                      checked={String(form.configValues?.[field.key] ?? field.defaultValue ?? "false") === "true"}
                      onChange={(event) => setForm((current) => ({ ...current, configValues: { ...(current.configValues ?? {}), [field.key]: event.target.checked ? "true" : "false" } }))}
                    />
                    {field.label}
                  </label>
                ) : (
                  <Input
                    key={field.key}
                    label={field.label}
                    type={field.sensitive ? "password" : field.type === "url" ? "url" : "text"}
                    placeholder={field.sensitive && editing ? "Leave blank to keep existing value" : field.placeholder ?? ""}
                    value={form.configValues?.[field.key] ?? field.defaultValue ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, configValues: { ...(current.configValues ?? {}), [field.key]: event.target.value } }))}
                    hint={field.helpText ?? undefined}
                    requiredMark={field.required}
                  />
                )
              ))}
            </>
          )}

          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 md:col-span-2">
            <input type="checkbox" checked={Boolean(form.active)} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
            Active provider
          </label>

          {/* Phone par 4-5 buttons ek line me screen se bahar jate the — stack karo. */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:flex-wrap sm:justify-end md:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" variant="secondary" onClick={resetForm}>Reset</Button>
            {tab === "sms" ? (
              <Button
                type="button"
                variant="secondary"
                disabled={testingDraft || !testMobileNumber.trim() || !selectedSmsProvider}
                onClick={() => void testSmsDraft(normalizeSmsForm(form), testMobileNumber, setTestingDraft, (error, fallbackMessage) => setApiError(error, fallbackMessage ?? "Unable to verify SMS provider connection"))}
              >
                {testingDraft ? "Testing..." : "Test Connection"}
              </Button>
            ) : null}
            {tab === "whatsapp" ? (
              <Button
                type="button"
                variant="secondary"
                disabled={testingDraft || !testMobileNumber.trim() || !selectedWhatsAppProvider}
                onClick={() => void testWhatsAppDraft(normalizeWhatsAppForm(form), testMobileNumber, testMessage, setTestingDraft, (error, fallbackMessage) => setApiError(error, fallbackMessage ?? "Unable to verify WhatsApp provider connection"))}
              >
                {testingDraft ? "Testing..." : "Test Connection"}
              </Button>
            ) : null}
            <Button type="button" disabled={saving || !canSaveProvider} onClick={() => void save()}>{saving ? "Saving..." : "Save Provider"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const ProviderFact = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0 rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-100">
    <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</dt>
    <dd className="mt-0.5 truncate text-sm font-semibold text-slate-800" title={value}>{value}</dd>
  </div>
);

// Provider kis account / number se bhejta hai.
const senderOf = (record: ProviderSettings, tab: CommunicationTab) =>
  (tab === "email" ? record.senderEmail : tab === "sms" ? record.senderId : record.whatsappNumber) || "--";

const normalizeTab = (value: string | null): CommunicationTab => {
  if (value === "sms" || value === "whatsapp") {
    return value;
  }
  return "email";
};

const normalizeEmailProvider = (value?: string) => {
  const provider = (value ?? "GMAIL_SMTP").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (provider === "AWSSES" || provider === "SES" || provider === "AWS_SES") {
    return "AWS_SES";
  }
  if (provider === "SENDGRID" || provider === "SEND_GRID") {
    return "SENDGRID";
  }
  return "GMAIL_SMTP";
};

const providerDefaults = (provider: string, current: ProviderSettingsRequest): ProviderSettingsRequest => {
  if (provider === "AWS_SES") {
    return {
      ...current,
      providerName: "AWS_SES",
      awsRegion: current.awsRegion || "ap-south-1",
      smtpHost: "",
      smtpPort: undefined,
      smtpUsername: "",
      smtpPassword: "",
      smtpTlsEnabled: true,
      sendgridApiKey: ""
    };
  }
  if (provider === "SENDGRID") {
    return {
      ...current,
      providerName: "SENDGRID",
      smtpHost: "",
      smtpPort: undefined,
      smtpUsername: "",
      smtpPassword: "",
      smtpTlsEnabled: true,
      awsAccessKey: "",
      awsSecretKey: "",
      awsRegion: ""
    };
  }
  return {
    ...current,
    providerName: "GMAIL_SMTP",
    smtpHost: current.smtpHost || "smtp.gmail.com",
    smtpPort: current.smtpPort || 587,
    smtpUsername: current.smtpUsername || current.senderEmail || "",
    smtpTlsEnabled: current.smtpTlsEnabled ?? true,
    awsAccessKey: "",
    awsSecretKey: "",
    awsRegion: "",
    sendgridApiKey: ""
  };
};

const emailEndpoint = (record: ProviderSettings) => {
  if (normalizeEmailProvider(record.providerName) === "SENDGRID") {
    return "api.sendgrid.com";
  }
  return normalizeEmailProvider(record.providerName) === "AWS_SES"
    ? record.awsRegion ?? "--"
    : `${record.smtpHost ?? "--"}:${record.smtpPort ?? 587}`;
};

const emailCredential = (record: ProviderSettings) => {
  if (normalizeEmailProvider(record.providerName) === "SENDGRID") {
    return record.sendgridApiKey ?? "--";
  }
  return normalizeEmailProvider(record.providerName) === "AWS_SES"
    ? record.awsAccessKey ?? "--"
    : record.smtpUsername ?? "--";
};

const saveEmailProvider = async (editing: ProviderSettings | null, form: ProviderSettingsRequest) => {
  if (editing) {
    await updateEmailSettings(editing.id, form);
    return;
  }
  await createEmailSettings(form);
};

const saveSmsProvider = async (editing: ProviderSettings | null, form: ProviderSettingsRequest) => {
  if (editing) {
    await updateSmsSettings(editing.id, form);
    return;
  }
  await createSmsSettings(form);
};

const saveWhatsAppProvider = async (editing: ProviderSettings | null, form: ProviderSettingsRequest) => {
  if (editing) {
    await updateWhatsAppSettings(editing.id, form);
    return;
  }
  await createWhatsAppSettings(form);
};

const buildProviderForm = (record: ProviderSettings, smsProviders: SmsProviderMetadata[], whatsAppProviders: WhatsAppProviderMetadata[]): ProviderSettingsRequest => {
  if (record.providerType && smsProviders.some((provider) => provider.providerType === record.providerType)) {
    return applySmsProviderDefaults({
      providerName: record.providerName,
      providerType: record.providerType,
      apiUrl: record.apiUrl ?? "",
      configValues: mapRecordConfigValues(record.configValues),
      active: record.active
    }, smsProviders.find((provider) => provider.providerType === record.providerType) ?? null);
  }
  if (record.providerType && whatsAppProviders.some((provider) => provider.providerType === record.providerType)) {
    return applyWhatsAppProviderDefaults({
      providerName: record.providerName,
      providerType: record.providerType,
      apiUrl: record.apiUrl ?? "",
      configValues: mapRecordConfigValues(record.configValues),
      active: record.active
    }, whatsAppProviders.find((provider) => provider.providerType === record.providerType) ?? null);
  }

  return {
    providerName: record.providerName,
    senderEmail: record.senderEmail ?? "",
    smtpHost: record.smtpHost ?? "smtp.gmail.com",
    smtpPort: record.smtpPort ?? 587,
    smtpUsername: record.smtpUsername ?? record.senderEmail ?? "",
    smtpPassword: "",
    smtpTlsEnabled: record.smtpTlsEnabled ?? true,
    awsAccessKey: record.awsAccessKey ?? "",
    awsSecretKey: "",
    awsRegion: record.awsRegion ?? "",
    sendgridApiKey: "",
    apiUrl: record.apiUrl ?? "",
    providerType: record.providerType ?? "MSG91",
    authKey: "",
    senderId: record.senderId ?? "",
    templateId: record.templateId ?? "",
    whatsappNumber: record.whatsappNumber ?? "",
    senderName: record.senderName ?? "",
    configValues: mapRecordConfigValues(record.configValues),
    active: record.active
  };
};

const providerDefaultConfig = <T extends { fields: Array<{ key: string; defaultValue?: string | null }> }>(provider: T | null) => {
  if (!provider) {
    return {};
  }
  return provider.fields.reduce<Record<string, string>>((accumulator, field) => {
    accumulator[field.key] = field.defaultValue ?? "";
    return accumulator;
  }, {});
};

const applySmsProviderDefaults = (current: ProviderSettingsRequest, provider: SmsProviderMetadata | null): ProviderSettingsRequest => {
  if (!provider) {
    return {
      ...current,
      providerName: current.providerName || "",
      providerType: current.providerType || "",
      configValues: current.configValues ?? {}
    };
  }

  const defaults = providerDefaultConfig(provider);
  const currentValues = current.providerType === provider.providerType ? current.configValues ?? {} : {};
  const configValues = { ...defaults, ...currentValues };

  return {
    ...current,
    providerName: current.providerType === provider.providerType && current.providerName?.trim() ? current.providerName : provider.providerName,
    providerType: provider.providerType,
    apiUrl: configValues.apiUrl ?? current.apiUrl ?? "",
    configValues
  };
};

const mapRecordConfigValues = (values?: Record<string, string | null> | null): Record<string, string> => {
  if (!values) {
    return {};
  }
  return Object.entries(values).reduce<Record<string, string>>((accumulator, [key, value]) => {
    accumulator[key] = value ?? "";
    return accumulator;
  }, {});
};

const applyWhatsAppProviderDefaults = (current: ProviderSettingsRequest, provider: WhatsAppProviderMetadata | null): ProviderSettingsRequest => {
  if (!provider) {
    return {
      ...current,
      providerName: current.providerName || "",
      providerType: current.providerType || "",
      configValues: current.configValues ?? {}
    };
  }

  const defaults = providerDefaultConfig(provider);
  const currentValues = current.providerType === provider.providerType ? current.configValues ?? {} : {};
  const configValues = { ...defaults, ...currentValues };

  return {
    ...current,
    providerName: current.providerType === provider.providerType && current.providerName?.trim() ? current.providerName : provider.providerName,
    providerType: provider.providerType,
    apiUrl: configValues.apiUrl ?? current.apiUrl ?? "",
    configValues
  };
};

const normalizeSmsForm = (form: ProviderSettingsRequest): ProviderSettingsRequest => {
  const configValues = mapRecordConfigValues(form.configValues);
  if (form.apiUrl && !configValues.apiUrl) {
    configValues.apiUrl = form.apiUrl;
  }
  return {
    ...form,
    providerName: form.providerName?.trim() || form.providerType || "SMS",
    apiUrl: configValues.apiUrl ?? form.apiUrl ?? "",
    configValues
  };
};

const canSaveSmsProvider = (form: ProviderSettingsRequest, providers: SmsProviderMetadata[], editing: boolean) => {
  const provider = providers.find((item) => item.providerType === form.providerType);
  if (!provider || !form.providerName?.trim()) {
    return false;
  }
  return provider.fields.every((field) => {
    if (!field.required) {
      return true;
    }
    const rawValue = form.configValues?.[field.key] ?? field.defaultValue ?? "";
    if (field.sensitive && editing && rawValue === "") {
      return true;
    }
    return String(rawValue).trim().length > 0;
  });
};

const resolveSmsCredential = (record: ProviderSettings) => {
  const configValues = record.configValues ?? {};
  return configValues.senderId
    ?? configValues.username
    ?? record.senderId
    ?? record.authKey
    ?? "--";
};

const buildSmsTestPayload = (form: ProviderSettingsRequest, mobileNumber: string) => {
  const normalized = normalizeSmsForm(form);
  return {
    mobileNumber,
    providerName: normalized.providerName,
    providerType: normalized.providerType,
    apiUrl: normalized.apiUrl,
    configValues: normalized.configValues ?? {}
  };
};

const testSmsDraft = async (
  form: ProviderSettingsRequest,
  testMobileNumber: string,
  setTestingDraft: (value: boolean) => void,
  setApiError: (error: unknown, fallbackMessage?: string) => void
) => {
  try {
    setTestingDraft(true);
    const payload = buildSmsTestPayload(form, testMobileNumber);
    await sendTestSms(payload);
    notificationService.showSuccess("SMS provider connection verified successfully.");
  } catch (error) {
    setApiError(error, "Unable to verify SMS provider connection");
  } finally {
    setTestingDraft(false);
  }
};

const normalizeWhatsAppForm = (form: ProviderSettingsRequest): ProviderSettingsRequest => {
  const configValues = mapRecordConfigValues(form.configValues);
  if (form.apiUrl && !configValues.apiUrl) {
    configValues.apiUrl = form.apiUrl;
  }
  return {
    ...form,
    providerName: form.providerName?.trim() || form.providerType || "WhatsApp",
    apiUrl: configValues.apiUrl ?? form.apiUrl ?? "",
    configValues
  };
};

const canSaveWhatsAppProvider = (form: ProviderSettingsRequest, providers: WhatsAppProviderMetadata[], editing: boolean) => {
  const provider = providers.find((item) => item.providerType === form.providerType);
  if (!provider || !form.providerName?.trim()) {
    return false;
  }
  return provider.fields.every((field) => {
    if (!field.required) {
      return true;
    }
    const rawValue = form.configValues?.[field.key] ?? field.defaultValue ?? "";
    if (field.sensitive && editing && rawValue === "") {
      return true;
    }
    return String(rawValue).trim().length > 0;
  });
};

const resolveWhatsAppCredential = (record: ProviderSettings) => {
  const configValues = record.configValues ?? {};
  return configValues.senderId
    ?? configValues.businessNumber
    ?? configValues.whatsappNumber
    ?? record.senderName
    ?? record.whatsappNumber
    ?? record.authKey
    ?? "--";
};

const buildWhatsAppTestPayload = (form: ProviderSettingsRequest, mobileNumber: string, message: string) => {
  const normalized = normalizeWhatsAppForm(form);
  return {
    mobileNumber,
    message,
    providerName: normalized.providerName,
    providerType: normalized.providerType,
    apiUrl: normalized.apiUrl,
    configValues: normalized.configValues ?? {}
  };
};

const testWhatsAppDraft = async (
  form: ProviderSettingsRequest,
  testMobileNumber: string,
  testMessage: string,
  setTestingDraft: (value: boolean) => void,
  setApiError: (error: unknown, fallbackMessage?: string) => void
) => {
  try {
    setTestingDraft(true);
    const payload = buildWhatsAppTestPayload(form, testMobileNumber, testMessage);
    await sendTestWhatsApp(payload);
    notificationService.showSuccess("WhatsApp provider connection verified successfully.");
  } catch (error) {
    setApiError(error, "Unable to verify WhatsApp provider connection");
  } finally {
    setTestingDraft(false);
  }
};

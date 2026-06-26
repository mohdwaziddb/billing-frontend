import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Edit3, Mail, MessageSquare, Plus, Send } from "lucide-react";
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
import {
  createPlatformAdminEmailSettings,
  createPlatformAdminSmsSettings,
  createPlatformAdminWhatsAppSettings,
  getPlatformAdminCompanies,
  getPlatformAdminEmailSettings,
  getPlatformAdminSmsProviders,
  getPlatformAdminSmsSettings,
  getPlatformAdminWhatsAppProviders,
  getPlatformAdminWhatsAppSettings,
  testPlatformAdminEmailSettings,
  testPlatformAdminSmsSettings,
  testPlatformAdminWhatsAppSettings,
  updatePlatformAdminEmailSettings,
  updatePlatformAdminSmsSettings,
  updatePlatformAdminWhatsAppSettings
} from "../api/platformAdmin";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { Select } from "../components/Select";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { useApiMessage } from "../hooks/useApiFeedback";
import { notificationService } from "../services/notificationService";
import type { PlatformAdminCompany, ProviderSettings, ProviderSettingsRequest, SmsProviderMetadata, WhatsAppProviderMetadata } from "../types/api";

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

const tabMeta: Record<CommunicationTab, { label: string; mode: string; defaults: ProviderSettingsRequest }> = {
  email: { label: "Email Services", mode: "Email Delivery", defaults: emailDefaults },
  sms: { label: "SMS Services", mode: "SMS Delivery", defaults: smsDefaults },
  whatsapp: { label: "WhatsApp Services", mode: "WhatsApp Messaging", defaults: whatsAppDefaults }
};

export const CommunicationSettingsPage = () => <CommunicationHubPage platformAdmin={false} />;

export const PlatformAdminCommunicationPage = () => <CommunicationHubPage platformAdmin />;

const CommunicationHubPage = ({ platformAdmin }: { platformAdmin: boolean }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<CommunicationTab>(normalizeTab(searchParams.get("tab")));
  const [companies, setCompanies] = useState<PlatformAdminCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [records, setRecords] = useState<ProviderSettings[]>([]);
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
    if (platformAdmin && !selectedCompanyId) {
      setSmsProviders([]);
      return;
    }
    const loadProviders = async () => {
      try {
        const providers = platformAdmin
          ? await getPlatformAdminSmsProviders(Number(selectedCompanyId))
          : await getSmsProviders();
        setSmsProviders(providers);
      } catch (error) {
        setApiError(error, "Unable to load SMS providers");
      }
    };
    void loadProviders();
  }, [platformAdmin, selectedCompanyId, setApiError, tab]);

  useEffect(() => {
    if (tab !== "whatsapp") {
      return;
    }
    if (platformAdmin && !selectedCompanyId) {
      setWhatsAppProviders([]);
      return;
    }
    const loadProviders = async () => {
      try {
        const providers = platformAdmin
          ? await getPlatformAdminWhatsAppProviders(Number(selectedCompanyId))
          : await getWhatsAppProviders();
        setWhatsAppProviders(providers);
      } catch (error) {
        setApiError(error, "Unable to load WhatsApp providers");
      }
    };
    void loadProviders();
  }, [platformAdmin, selectedCompanyId, setApiError, tab]);

  useEffect(() => {
    if (!platformAdmin) {
      return;
    }
    void getPlatformAdminCompanies({ active: true, page: 0, size: 1000 })
      .then((response) => {
        setCompanies(response.records);
        setSelectedCompanyId((current) => current || (response.records[0] ? String(response.records[0].id) : ""));
      })
      .catch((error) => setApiError(error, "Unable to load companies"));
  }, [platformAdmin, setApiError]);

  const refresh = async () => {
    if (platformAdmin && !selectedCompanyId) {
      setRecords([]);
      return;
    }
    try {
      if (tab === "email") {
        setRecords(platformAdmin ? await getPlatformAdminEmailSettings(Number(selectedCompanyId)) : await getEmailSettings());
        return;
      }
      if (tab === "sms") {
        setRecords(platformAdmin ? await getPlatformAdminSmsSettings(Number(selectedCompanyId)) : await getSmsSettings());
        return;
      }
      setRecords(platformAdmin ? await getPlatformAdminWhatsAppSettings(Number(selectedCompanyId)) : await getWhatsAppSettings());
    } catch (error) {
      setApiError(error, `Unable to load ${tabMeta[tab].label.toLowerCase()}`);
    }
  };

  useEffect(() => {
    void refresh();
  }, [tab, selectedCompanyId]);

  const switchTab = (nextTab: CommunicationTab) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", nextTab);
    setSearchParams(params, { replace: true });
  };

  const startCreate = () => {
    if (platformAdmin && !selectedCompanyId) {
      notificationService.showError("Select a company first.");
      return;
    }
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
        await saveEmailProvider(platformAdmin, selectedCompanyId, editing, form);
      } else if (tab === "sms") {
        await saveSmsProvider(platformAdmin, selectedCompanyId, editing, normalizeSmsForm(form));
      } else {
        await saveWhatsAppProvider(platformAdmin, selectedCompanyId, editing, normalizeWhatsAppForm(form));
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
        if (platformAdmin) {
          await testPlatformAdminEmailSettings(Number(selectedCompanyId), testRecipient);
        } else {
          await sendTestEmail(testRecipient);
        }
        notificationService.showSuccess("Test email sent successfully.");
      } else if (tab === "sms") {
        if (platformAdmin) {
          await testPlatformAdminSmsSettings(Number(selectedCompanyId), { mobileNumber: testMobileNumber });
        } else {
          await sendTestSms({ mobileNumber: testMobileNumber });
        }
        notificationService.showSuccess("Test SMS sent successfully.");
      } else {
        if (platformAdmin) {
          await testPlatformAdminWhatsAppSettings(Number(selectedCompanyId), { mobileNumber: testMobileNumber, message: testMessage });
        } else {
          await sendTestWhatsApp({ mobileNumber: testMobileNumber, message: testMessage });
        }
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

  const selectedCompanyName = companies.find((company) => String(company.id) === selectedCompanyId)?.name ?? "";

  return (
    <div className="space-y-4 pb-6">
      <Header
        title={platformAdmin ? "Communication" : "Communication Services"}
        subtitle={platformAdmin
          ? "Centralized communication management hub for company-wise Email, SMS, and WhatsApp providers."
          : "Manage Email, SMS, and WhatsApp providers for your company from one communication hub."}
      />

      <GlassCard className="p-6 md:p-7">
        <div className="flex flex-col gap-4">
          <CommonBreadcrumb items={platformAdmin ? [{ label: "Platform Administration" }, { label: "Communication" }] : [{ label: "Setup" }, { label: "Communication" }]} />

          {platformAdmin ? (
            <div className="max-w-md">
              <Select
                label="Company"
                value={selectedCompanyId}
                options={[
                  { label: "Select company", value: "" },
                  ...companies.map((company) => ({ label: company.name, value: String(company.id) }))
                ]}
                onChange={(event) => setSelectedCompanyId(event.target.value)}
              />
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {([
              ["email", "Email Services"],
              ["sms", "SMS Services"],
              ["whatsapp", "WhatsApp Services"]
            ] as const).map(([value, label]) => {
              const active = tab === value;
              return (
                <button
                  key={value}
                  type="button"
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-[var(--theme-color)] bg-[color:color-mix(in_srgb,var(--theme-color)_12%,white)] text-[var(--theme-color)]"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  }`}
                  onClick={() => switchTab(value)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {platformAdmin && !selectedCompanyId ? (
          <div className="mt-6 rounded-[var(--radius-card)] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            Select a company to load company-scoped communication providers.
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid flex-1 gap-4 md:grid-cols-3">
                <ProviderMetric label="Total Providers" value={records.length} />
                <ProviderMetric label="Active Provider" value={records.find((record) => record.active)?.providerName ?? "Not Set"} />
                <ProviderMetric label="Mode" value={tabMeta[tab].mode} />
              </div>
              <Button type="button" onClick={startCreate}>
                <Plus size={16} /> Add Provider
              </Button>
            </div>

            {platformAdmin && selectedCompanyName ? (
              <div className="mt-4 rounded-[var(--radius-card)] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Managing communication providers for <span className="font-semibold text-slate-950">{selectedCompanyName}</span>
              </div>
            ) : null}

            {tab === "email" ? (
              <div className="mt-5 flex flex-col gap-3 rounded-[var(--radius-card)] border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-end">
                <Input label="Test Recipient Email" type="email" value={testRecipient} onChange={(event) => setTestRecipient(event.target.value)} placeholder="Defaults to company email" />
                <div className="text-sm text-slate-500">Use the active email provider to verify delivery.</div>
              </div>
            ) : tab === "sms" ? (
              <div className="mt-5 flex flex-col gap-3 rounded-[var(--radius-card)] border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-end">
                <Input label="Test Mobile Number" value={testMobileNumber} onChange={(event) => setTestMobileNumber(event.target.value)} placeholder="Defaults to company phone" />
                <div className="text-sm text-slate-500">Use the active SMS provider to verify delivery.</div>
              </div>
            ) : (
              <div className="mt-5 grid gap-3 rounded-[var(--radius-card)] border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                <Input label="Test Mobile Number" value={testMobileNumber} onChange={(event) => setTestMobileNumber(event.target.value)} placeholder="Defaults to company phone" />
                <label className="block space-y-2">
                  <span className="block text-sm font-semibold text-slate-700">Test Message</span>
                  <textarea
                    className="min-h-[112px] w-full rounded-[var(--radius-control)] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--theme-color)] focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_14%,transparent)]"
                    value={testMessage}
                    onChange={(event) => setTestMessage(event.target.value)}
                  />
                </label>
              </div>
            )}

            <div className="mt-5">
              <Table
                data={records}
                emptyText={`No ${tabMeta[tab].label.toLowerCase()} found. Click "Add Provider" to create the first record.`}
                columns={[
                  {
                    key: "provider",
                    header: "Provider",
                    render: (record) => (
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--theme-light)] text-[var(--theme-light-contrast)]">
                          {tab === "email" ? <Mail size={18} /> : <MessageSquare size={18} />}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-950">{record.providerName}</p>
                          <p className="text-xs text-slate-500">
                            {tab === "email"
                              ? record.senderEmail ?? "--"
                              : tab === "sms"
                                ? record.providerType ?? record.senderId ?? "--"
                                : record.providerType ?? record.whatsappNumber ?? "--"}
                          </p>
                        </div>
                      </div>
                    )
                  },
                  {
                    key: "endpoint",
                    header: tab === "email" ? "Endpoint" : "API URL",
                    render: (record) => <span className="break-all text-slate-700">{tab === "email" ? emailEndpoint(record) : record.apiUrl ?? "--"}</span>
                  },
                  {
                    key: "credentials",
                    header: tab === "whatsapp" ? "Sender" : "Credential",
                    render: (record) => <span className="text-slate-700">{tab === "email" ? emailCredential(record) : tab === "sms" ? resolveSmsCredential(record) : resolveWhatsAppCredential(record)}</span>
                  },
                  { key: "status", header: "Status", render: (record) => <StatusBadge label={record.active ? "ACTIVE" : "INACTIVE"} /> },
                  {
                    key: "actions",
                    header: "Actions",
                    className: "text-right",
                    render: (record) => (
                      <div className="flex justify-end gap-2">
                        {record.active ? (
                          <Button type="button" variant="secondary" disabled={testingId === record.id} onClick={() => void testProvider(record)}>
                            <Send size={15} /> {testingId === record.id ? "Sending..." : tab === "email" ? "Test Email" : tab === "sms" ? "Test SMS" : "Test Message"}
                          </Button>
                        ) : null}
                        <Button type="button" variant="secondary" onClick={() => startEdit(record)}>
                          <Edit3 size={15} /> Edit
                        </Button>
                      </div>
                    )
                  }
                ]}
              />
            </div>
          </>
        )}
      </GlassCard>

      <Modal open={open} title={editing ? `Edit ${tabMeta[tab].label}` : `Add ${tabMeta[tab].label}`} onClose={() => setOpen(false)}>
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
                  <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 md:col-span-2">
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
                  <label key={field.key} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 md:col-span-2">
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
                  <label key={field.key} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 md:col-span-2">
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

          <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 md:col-span-2">
            <input type="checkbox" checked={Boolean(form.active)} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
            Active provider
          </label>

          <div className="flex justify-end gap-3 md:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" variant="secondary" onClick={resetForm}>Reset</Button>
            {tab === "sms" ? (
              <Button
                type="button"
                variant="secondary"
                disabled={testingDraft || !testMobileNumber.trim() || !selectedSmsProvider}
                onClick={() => void testSmsDraft(platformAdmin, selectedCompanyId, normalizeSmsForm(form), testMobileNumber, setTestingDraft, (error, fallbackMessage) => setApiError(error, fallbackMessage ?? "Unable to verify SMS provider connection"))}
              >
                {testingDraft ? "Testing..." : "Test Connection"}
              </Button>
            ) : null}
            {tab === "whatsapp" ? (
              <Button
                type="button"
                variant="secondary"
                disabled={testingDraft || !testMobileNumber.trim() || !selectedWhatsAppProvider}
                onClick={() => void testWhatsAppDraft(platformAdmin, selectedCompanyId, normalizeWhatsAppForm(form), testMobileNumber, testMessage, setTestingDraft, (error, fallbackMessage) => setApiError(error, fallbackMessage ?? "Unable to verify WhatsApp provider connection"))}
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

const ProviderMetric = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-[var(--radius-card)] border border-slate-200 bg-slate-50 p-4">
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
    <p className="mt-2 truncate text-lg font-extrabold text-slate-950">{value}</p>
  </div>
);

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

const saveEmailProvider = async (platformAdmin: boolean, selectedCompanyId: string, editing: ProviderSettings | null, form: ProviderSettingsRequest) => {
  if (platformAdmin) {
    if (editing) {
      await updatePlatformAdminEmailSettings(Number(selectedCompanyId), editing.id, form);
      return;
    }
    await createPlatformAdminEmailSettings(Number(selectedCompanyId), form);
    return;
  }
  if (editing) {
    await updateEmailSettings(editing.id, form);
    return;
  }
  await createEmailSettings(form);
};

const saveSmsProvider = async (platformAdmin: boolean, selectedCompanyId: string, editing: ProviderSettings | null, form: ProviderSettingsRequest) => {
  if (platformAdmin) {
    if (editing) {
      await updatePlatformAdminSmsSettings(Number(selectedCompanyId), editing.id, form);
      return;
    }
    await createPlatformAdminSmsSettings(Number(selectedCompanyId), form);
    return;
  }
  if (editing) {
    await updateSmsSettings(editing.id, form);
    return;
  }
  await createSmsSettings(form);
};

const saveWhatsAppProvider = async (platformAdmin: boolean, selectedCompanyId: string, editing: ProviderSettings | null, form: ProviderSettingsRequest) => {
  if (platformAdmin) {
    if (editing) {
      await updatePlatformAdminWhatsAppSettings(Number(selectedCompanyId), editing.id, form);
      return;
    }
    await createPlatformAdminWhatsAppSettings(Number(selectedCompanyId), form);
    return;
  }
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
  platformAdmin: boolean,
  selectedCompanyId: string,
  form: ProviderSettingsRequest,
  testMobileNumber: string,
  setTestingDraft: (value: boolean) => void,
  setApiError: (error: unknown, fallbackMessage?: string) => void
) => {
  try {
    setTestingDraft(true);
    const payload = buildSmsTestPayload(form, testMobileNumber);
    if (platformAdmin) {
      await testPlatformAdminSmsSettings(Number(selectedCompanyId), payload);
    } else {
      await sendTestSms(payload);
    }
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
  platformAdmin: boolean,
  selectedCompanyId: string,
  form: ProviderSettingsRequest,
  testMobileNumber: string,
  testMessage: string,
  setTestingDraft: (value: boolean) => void,
  setApiError: (error: unknown, fallbackMessage?: string) => void
) => {
  try {
    setTestingDraft(true);
    const payload = buildWhatsAppTestPayload(form, testMobileNumber, testMessage);
    if (platformAdmin) {
      await testPlatformAdminWhatsAppSettings(Number(selectedCompanyId), payload);
    } else {
      await sendTestWhatsApp(payload);
    }
    notificationService.showSuccess("WhatsApp provider connection verified successfully.");
  } catch (error) {
    setApiError(error, "Unable to verify WhatsApp provider connection");
  } finally {
    setTestingDraft(false);
  }
};

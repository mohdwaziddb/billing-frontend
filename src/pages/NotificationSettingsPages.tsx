import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Edit3, Mail, MessageSquare, Plus, Send } from "lucide-react";
import {
  createEmailSettings,
  createSmsSettings,
  createWhatsAppSettings,
  getEmailSettings,
  getSmsSettings,
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
  getPlatformAdminSmsSettings,
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
import type { PlatformAdminCompany, ProviderSettings, ProviderSettingsRequest } from "../types/api";

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
  authKey: "",
  senderId: "",
  templateId: "",
  active: true
};

const whatsAppDefaults: ProviderSettingsRequest = {
  providerName: "MSG91 WhatsApp",
  providerType: "MSG91",
  apiUrl: "https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message",
  authKey: "",
  whatsappNumber: "",
  senderName: "",
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
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<CommunicationTab>(normalizeTab(searchParams.get("tab")));
  const [companies, setCompanies] = useState<PlatformAdminCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [records, setRecords] = useState<ProviderSettings[]>([]);
  const [editing, setEditing] = useState<ProviderSettings | null>(null);
  const [form, setForm] = useState<ProviderSettingsRequest>({ ...tabMeta[tab].defaults });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testRecipient, setTestRecipient] = useState("");
  const [testMobileNumber, setTestMobileNumber] = useState("");
  const [testMessage, setTestMessage] = useState("This is a test WhatsApp message from your active provider.");
  const { setApiError } = useApiMessage();

  useEffect(() => {
    const nextTab = normalizeTab(searchParams.get("tab"));
    setTab(nextTab);
  }, [searchParams]);

  useEffect(() => {
    setForm({ ...tabMeta[tab].defaults });
    setEditing(null);
    setOpen(false);
  }, [tab]);

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
    setForm({ ...tabMeta[tab].defaults });
    setOpen(true);
  };

  const startEdit = (record: ProviderSettings) => {
    setEditing(record);
    setForm({
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
      active: record.active
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      setSaving(true);
      if (tab === "email") {
        await saveEmailProvider(platformAdmin, selectedCompanyId, editing, form);
      } else if (tab === "sms") {
        await saveSmsProvider(platformAdmin, selectedCompanyId, editing, form);
      } else {
        await saveWhatsAppProvider(platformAdmin, selectedCompanyId, editing, form);
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
          await testPlatformAdminSmsSettings(Number(selectedCompanyId), testMobileNumber);
        } else {
          await sendTestSms(testMobileNumber);
        }
        notificationService.showSuccess("Test SMS sent successfully.");
      } else {
        if (platformAdmin) {
          await testPlatformAdminWhatsAppSettings(Number(selectedCompanyId), testMobileNumber, testMessage);
        } else {
          await sendTestWhatsApp(testMobileNumber, testMessage);
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
  const canSaveProvider = tab === "email"
    ? emailProvider === "AWS_SES"
      ? Boolean(form.senderEmail?.trim() && form.awsAccessKey?.trim() && (editing || form.awsSecretKey?.trim()) && form.awsRegion?.trim())
      : emailProvider === "SENDGRID"
        ? Boolean(form.senderEmail?.trim() && (editing || form.sendgridApiKey?.trim()))
        : Boolean(form.senderEmail?.trim() && form.smtpHost?.trim() && form.smtpPort && form.smtpUsername?.trim() && (editing || form.smtpPassword?.trim()))
    : tab === "sms"
      ? Boolean(form.providerName?.trim() && form.providerType?.trim() && form.apiUrl?.trim() && (editing || form.authKey?.trim()) && form.senderId?.trim() && form.templateId?.trim())
      : Boolean(form.providerName?.trim() && form.providerType?.trim() && form.apiUrl?.trim() && (editing || form.authKey?.trim()) && form.whatsappNumber?.trim());

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
                  <textarea className="min-h-[112px] w-full rounded-[var(--radius-control)] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--theme-color)] focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_14%,transparent)]" value={testMessage} onChange={(event) => setTestMessage(event.target.value)} />
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
                                : record.whatsappNumber ?? record.providerType ?? "--"}
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
                    render: (record) => <span className="text-slate-700">{tab === "email" ? emailCredential(record) : tab === "sms" ? record.authKey ?? "--" : record.senderName || record.authKey || "--"}</span>
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
          ) : (
            <>
              <Input label="Provider Name" value={form.providerName ?? ""} onChange={(event) => setForm((current) => ({ ...current, providerName: event.target.value }))} />
              <Select
                label="Provider Type"
                value={form.providerType ?? "MSG91"}
                options={[{ label: "MSG91", value: "MSG91" }]}
                onChange={(event) => setForm((current) => ({ ...current, providerType: event.target.value }))}
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
              <Input label="API URL" value={form.apiUrl ?? ""} onChange={(event) => setForm((current) => ({ ...current, apiUrl: event.target.value }))} />
              <Input label="Auth Key" type="password" placeholder={editing ? "Leave blank to keep existing auth key" : ""} value={form.authKey ?? ""} onChange={(event) => setForm((current) => ({ ...current, authKey: event.target.value }))} />
              <Input label="Sender ID" value={form.senderId ?? ""} onChange={(event) => setForm((current) => ({ ...current, senderId: event.target.value }))} />
              <Input label="Template ID" value={form.templateId ?? ""} onChange={(event) => setForm((current) => ({ ...current, templateId: event.target.value }))} />
            </>
          ) : (
            <>
              <Input label="WhatsApp Number" value={form.whatsappNumber ?? ""} onChange={(event) => setForm((current) => ({ ...current, whatsappNumber: event.target.value }))} />
              <Input label="Auth Key" type="password" placeholder={editing ? "Leave blank to keep existing auth key" : ""} value={form.authKey ?? ""} onChange={(event) => setForm((current) => ({ ...current, authKey: event.target.value }))} />
              <Input label="API URL" value={form.apiUrl ?? ""} onChange={(event) => setForm((current) => ({ ...current, apiUrl: event.target.value }))} />
              <Input label="Sender Name" value={form.senderName ?? ""} onChange={(event) => setForm((current) => ({ ...current, senderName: event.target.value }))} />
            </>
          )}

          <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 md:col-span-2">
            <input type="checkbox" checked={Boolean(form.active)} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
            Active provider
          </label>
          <div className="flex justify-end gap-3 md:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
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

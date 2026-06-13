import { useEffect, useState } from "react";
import { Edit3, Mail, MessageSquare, Plus, Send } from "lucide-react";
import { createEmailSettings, createSmsSettings, getEmailSettings, getSmsSettings, sendTestEmail, updateEmailSettings, updateSmsSettings } from "../api/notifications";
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
import type { ProviderSettings, ProviderSettingsRequest } from "../types/api";

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
  active: true
};

const smsDefaults: ProviderSettingsRequest = {
  providerName: "MSG91",
  apiUrl: "",
  username: "",
  password: "",
  senderId: "",
  channelName: "SMS",
  active: true
};

export const EmailSettingsPage = () => (
  <ProviderSettingsPage
    type="email"
    title="Email Settings"
    subtitle="Manage multiple email providers. Activating one provider automatically deactivates the previous active provider."
    breadcrumb="Email Settings"
    defaults={emailDefaults}
    load={getEmailSettings}
    create={createEmailSettings}
    update={updateEmailSettings}
  />
);

export const SmsSettingsPage = () => (
  <ProviderSettingsPage
    type="sms"
    title="SMS Settings"
    subtitle="Manage multiple SMS providers with one active gateway per company."
    breadcrumb="SMS Settings"
    defaults={smsDefaults}
    load={getSmsSettings}
    create={createSmsSettings}
    update={updateSmsSettings}
  />
);

const ProviderSettingsPage = ({
  type,
  title,
  subtitle,
  breadcrumb,
  defaults,
  load,
  create,
  update
}: {
  type: "email" | "sms";
  title: string;
  subtitle: string;
  breadcrumb: string;
  defaults: ProviderSettingsRequest;
  load: () => Promise<ProviderSettings[]>;
  create: (payload: ProviderSettingsRequest) => Promise<ProviderSettings>;
  update: (id: number, payload: ProviderSettingsRequest) => Promise<ProviderSettings>;
}) => {
  const [records, setRecords] = useState<ProviderSettings[]>([]);
  const [editing, setEditing] = useState<ProviderSettings | null>(null);
  const [form, setForm] = useState<ProviderSettingsRequest>(defaults);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testRecipient, setTestRecipient] = useState("");
  const [successToast, setSuccessToast] = useState("");
  const { setApiError } = useApiMessage();

  const refresh = async () => {
    try {
      setRecords(await load());
    } catch (error) {
      setApiError(error, `Unable to load ${type} settings`);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const startCreate = () => {
    setEditing(null);
    setForm({ ...defaults });
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
      apiUrl: record.apiUrl ?? "",
      username: record.username ?? "",
      password: "",
      senderId: record.senderId ?? "",
      channelName: record.channelName ?? "",
      active: record.active
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      setSaving(true);
      setSuccessToast("");
      if (editing) {
        await update(editing.id, form);
      } else {
        await create(form);
      }
      setSuccessToast(`${type === "email" ? "Email" : "SMS"} provider saved successfully.`);
      setOpen(false);
      await refresh();
    } catch (error) {
      setApiError(error, `Unable to save ${type} settings`);
    } finally {
      setSaving(false);
    }
  };

  const testEmail = async (record: ProviderSettings) => {
    try {
      setTestingId(record.id);
      setSuccessToast("");
      await sendTestEmail(testRecipient);
      setSuccessToast("Test email sent successfully.");
    } catch (error) {
      setApiError(error, "Unable to send test email");
    } finally {
      setTestingId(null);
    }
  };

  const Icon = type === "email" ? Mail : MessageSquare;
  const emailProvider = normalizeEmailProvider(form.providerName);

  return (
    <div className="space-y-4 pb-6">
      <Header title={title} subtitle={subtitle} />
      {successToast ? (
        <div className="glass rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-200">
          {successToast}
        </div>
      ) : null}
      <GlassCard className="p-6 md:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CommonBreadcrumb items={[{ label: breadcrumb }]} />
          <Button type="button" onClick={startCreate}>
            <Plus size={16} /> Add Provider
          </Button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <ProviderMetric label="Total Providers" value={records.length} />
          <ProviderMetric label="Active Provider" value={records.find((record) => record.active)?.providerName ?? "Not Set"} />
          <ProviderMetric label="Mode" value={type === "email" ? "Email Delivery" : "SMS Delivery"} />
        </div>
        {type === "email" ? (
          <div className="mt-5 flex flex-col gap-3 rounded-[var(--radius-card)] border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-end">
            <Input label="Test Recipient Email" type="email" value={testRecipient} onChange={(event) => setTestRecipient(event.target.value)} placeholder="Defaults to company email" />
            <div className="text-sm text-slate-500">Use the active EMAIL provider to verify delivery.</div>
          </div>
        ) : null}

        <div className="mt-5">
          <Table
            data={records}
            emptyText={`No ${type} providers found. Click "Add Provider" to create your first record.`}
            columns={[
              {
                key: "provider",
                header: "Provider",
                render: (record) => (
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--theme-light)] text-[var(--theme-light-contrast)]">
                      <Icon size={18} />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-950">{record.providerName}</p>
                      <p className="text-xs text-slate-500">{type === "email" ? record.senderEmail ?? "--" : record.channelName ?? record.senderId ?? "--"}</p>
                    </div>
                  </div>
                )
              },
              { key: "endpoint", header: type === "email" ? "Endpoint" : "API URL", render: (record) => <span className="break-all text-slate-700">{type === "email" ? emailEndpoint(record) : record.apiUrl ?? "--"}</span> },
              { key: "credentials", header: "Credential User", render: (record) => <span className="text-slate-700">{type === "email" ? emailCredential(record) : record.username ?? "--"}</span> },
              { key: "status", header: "Status", render: (record) => <StatusBadge label={record.active ? "ACTIVE" : "INACTIVE"} /> },
              {
                key: "actions",
                header: "Actions",
                className: "text-right",
                render: (record) => (
                  <div className="flex justify-end gap-2">
                    {type === "email" && record.active ? (
                      <Button type="button" variant="secondary" disabled={testingId === record.id} onClick={() => void testEmail(record)}>
                        <Send size={15} /> {testingId === record.id ? "Sending..." : "Test"}
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
      </GlassCard>

      <Modal open={open} title={editing ? `Edit ${type === "email" ? "Email" : "SMS"} Provider` : `Add ${type === "email" ? "Email" : "SMS"} Provider`} onClose={() => setOpen(false)}>
        <div className="grid gap-4 md:grid-cols-2">
          {type === "email" ? (
            <Select
              label="Provider Type"
              value={emailProvider}
              options={[
                { label: "Gmail SMTP", value: "GMAIL_SMTP" },
                { label: "AWS SES", value: "AWS_SES" }
              ]}
              onChange={(event) => setForm((current) => providerDefaults(event.target.value, current))}
            />
          ) : (
            <Input label="Provider Name" value={form.providerName ?? ""} onChange={(event) => setForm((current) => ({ ...current, providerName: event.target.value }))} />
          )}
          {type === "email" ? (
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
              ) : (
                <>
                  <Input label="AWS Access Key" value={form.awsAccessKey ?? ""} onChange={(event) => setForm((current) => ({ ...current, awsAccessKey: event.target.value }))} />
                  <Input label="AWS Secret Key" type="password" placeholder={editing ? "Leave blank to keep existing secret" : ""} value={form.awsSecretKey ?? ""} onChange={(event) => setForm((current) => ({ ...current, awsSecretKey: event.target.value }))} />
                  <Input label="AWS Region" value={form.awsRegion ?? ""} onChange={(event) => setForm((current) => ({ ...current, awsRegion: event.target.value }))} />
                </>
              )}
            </>
          ) : (
            <>
              <Input label="API URL" value={form.apiUrl ?? ""} onChange={(event) => setForm((current) => ({ ...current, apiUrl: event.target.value }))} />
              <Input label="Username" value={form.username ?? ""} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} />
              <Input label="Password" type="password" placeholder={editing ? "Leave blank to keep existing password" : ""} value={form.password ?? ""} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
              <Input label="Sender ID" value={form.senderId ?? ""} onChange={(event) => setForm((current) => ({ ...current, senderId: event.target.value }))} />
              <Input label="Channel Name" value={form.channelName ?? ""} onChange={(event) => setForm((current) => ({ ...current, channelName: event.target.value }))} />
            </>
          )}
          <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 md:col-span-2">
            <input type="checkbox" checked={Boolean(form.active)} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
            Active provider
          </label>
          <div className="flex justify-end gap-3 md:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" disabled={saving} onClick={() => void save()}>{saving ? "Saving..." : "Save Provider"}</Button>
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

const normalizeEmailProvider = (value?: string) => {
  const provider = (value ?? "GMAIL_SMTP").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (provider === "AWSSES" || provider === "SES" || provider === "AWS_SES") {
    return "AWS_SES";
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
      smtpTlsEnabled: true
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
    awsRegion: ""
  };
};

const emailEndpoint = (record: ProviderSettings) => {
  return normalizeEmailProvider(record.providerName) === "AWS_SES"
    ? record.awsRegion ?? "--"
    : `${record.smtpHost ?? "--"}:${record.smtpPort ?? 587}`;
};

const emailCredential = (record: ProviderSettings) => {
  return normalizeEmailProvider(record.providerName) === "AWS_SES"
    ? record.awsAccessKey ?? "--"
    : record.smtpUsername ?? "--";
};

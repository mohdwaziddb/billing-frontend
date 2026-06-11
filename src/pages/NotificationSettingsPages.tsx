import { useEffect, useState } from "react";
import { Edit3, Mail, MessageSquare, Plus } from "lucide-react";
import { createEmailSettings, createSmsSettings, getEmailSettings, getSmsSettings, updateEmailSettings, updateSmsSettings } from "../api/notifications";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { useApiMessage } from "../hooks/useApiFeedback";
import type { ProviderSettings, ProviderSettingsRequest } from "../types/api";

const emailDefaults: ProviderSettingsRequest = {
  providerName: "AWS SES",
  senderEmail: "",
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
    setForm(defaults);
    setOpen(true);
  };

  const startEdit = (record: ProviderSettings) => {
    setEditing(record);
    setForm({
      providerName: record.providerName,
      senderEmail: record.senderEmail ?? "",
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
      if (editing) {
        await update(editing.id, form);
      } else {
        await create(form);
      }
      setOpen(false);
      await refresh();
    } catch (error) {
      setApiError(error, `Unable to save ${type} settings`);
    } finally {
      setSaving(false);
    }
  };

  const Icon = type === "email" ? Mail : MessageSquare;

  return (
    <div className="space-y-4 pb-6">
      <Header title={title} subtitle={subtitle} />
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
              { key: "endpoint", header: type === "email" ? "Region" : "API URL", render: (record) => <span className="break-all text-slate-700">{type === "email" ? record.awsRegion ?? "--" : record.apiUrl ?? "--"}</span> },
              { key: "credentials", header: "Credential User", render: (record) => <span className="text-slate-700">{type === "email" ? record.awsAccessKey ?? "--" : record.username ?? "--"}</span> },
              { key: "status", header: "Status", render: (record) => <StatusBadge label={record.active ? "ACTIVE" : "INACTIVE"} /> },
              {
                key: "actions",
                header: "Actions",
                className: "text-right",
                render: (record) => (
                  <Button type="button" variant="secondary" onClick={() => startEdit(record)}>
                    <Edit3 size={15} /> Edit
                  </Button>
                )
              }
            ]}
          />
        </div>
      </GlassCard>

      <Modal open={open} title={editing ? `Edit ${type === "email" ? "Email" : "SMS"} Provider` : `Add ${type === "email" ? "Email" : "SMS"} Provider`} onClose={() => setOpen(false)}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Provider Name" value={form.providerName ?? ""} onChange={(event) => setForm((current) => ({ ...current, providerName: event.target.value }))} />
          {type === "email" ? (
            <>
              <Input label="Sender Email" value={form.senderEmail ?? ""} onChange={(event) => setForm((current) => ({ ...current, senderEmail: event.target.value }))} />
              <Input label="AWS Access Key" value={form.awsAccessKey ?? ""} onChange={(event) => setForm((current) => ({ ...current, awsAccessKey: event.target.value }))} />
              <Input label="AWS Secret Key" type="password" placeholder={editing ? "Leave blank to keep existing secret" : ""} value={form.awsSecretKey ?? ""} onChange={(event) => setForm((current) => ({ ...current, awsSecretKey: event.target.value }))} />
              <Input label="AWS Region" value={form.awsRegion ?? ""} onChange={(event) => setForm((current) => ({ ...current, awsRegion: event.target.value }))} />
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

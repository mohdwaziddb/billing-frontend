import { useEffect, useState } from "react";
import { Eye, FilePlus2, Pencil } from "lucide-react";
import { createSmsTemplate, deleteSmsTemplate, getSmsTemplateVariables, getSmsTemplatesPage, previewSmsTemplate, updateSmsTemplate } from "../api/smsTemplates";
import { ActionDropdown } from "../components/ActionDropdown";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { CommonDeleteIcon } from "../components/CommonDeleteAction";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { DEFAULT_PAGE_SIZE, Pagination } from "../components/Pagination";
import { PreviewSurface } from "../components/PreviewSurface";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";
import { formatDate } from "../lib/format";
import type { EmailPreview, PageResponse, SmsTemplate, SmsTemplateRequest } from "../types/api";

const emptyPage: PageResponse<SmsTemplate> = { records: [], page: 0, size: DEFAULT_PAGE_SIZE, totalRecords: 0, totalPages: 0 };
const defaultForm: SmsTemplateRequest = { templateName: "", templateBody: "Dear {{Customer_Name}}, your outstanding amount is {{Outstanding_Amount}}. - {{Company_Name}}", active: true };

export const SmsTemplatePage = () => {
  const [templatePage, setTemplatePage] = useState<PageResponse<SmsTemplate>>(emptyPage);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);
  const [form, setForm] = useState<SmsTemplateRequest>(defaultForm);
  const [preview, setPreview] = useState<EmailPreview | null>(null);
  const { can } = useAuth();
  const { setApiError } = useApiMessage();
  const canSaveTemplate = Boolean(form.templateName.trim() && form.templateBody.trim());

  const loadTemplates = async (nextPage = 0, searchOverride = search) => {
    try {
      setTemplatePage(await getSmsTemplatesPage({ search: searchOverride.trim() || undefined, page: nextPage, size: DEFAULT_PAGE_SIZE }));
    } catch (err: any) {
      setApiError(err, "Unable to load SMS templates");
    }
  };

  useEffect(() => {
    void loadTemplates(0);
    void getSmsTemplateVariables().then(setVariables).catch(() => setVariables({}));
  }, []);

  const openCreate = () => {
    setEditingTemplate(null);
    setForm(defaultForm);
    setFormOpen(true);
  };

  const openEdit = (template: SmsTemplate) => {
    setEditingTemplate(template);
    setForm({ templateName: template.templateName, templateBody: template.templateBody, active: template.active });
    setFormOpen(true);
  };

  const saveTemplate = async () => {
    try {
      if (editingTemplate) {
        await updateSmsTemplate(editingTemplate.id, form);
      } else {
        await createSmsTemplate(form);
      }
      setFormOpen(false);
      await loadTemplates(templatePage.page);
    } catch (err: any) {
      setApiError(err, "Unable to save SMS template");
    }
  };

  const openPreview = async (template: SmsTemplate) => {
    try {
      setPreview(await previewSmsTemplate(template.id, sampleVariables));
    } catch (err: any) {
      setApiError(err, "Unable to preview SMS template");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col space-y-4 pb-6">
      <Header title="SMS Templates" subtitle="Manage reusable SMS templates with dynamic customer, invoice, and company variables." />
      <GlassCard className="flex min-h-[640px] flex-1 flex-col p-6 md:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <CommonBreadcrumb items={[{ label: "SMS Templates" }]} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              aria-label="Search SMS templates"
              placeholder="Search templates"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClear={() => {
                setSearch("");
                void loadTemplates(0, "");
              }}
              onKeyDown={(event) => event.key === "Enter" && void loadTemplates(0)}
            />
            <Button variant="secondary" onClick={() => void loadTemplates(0)}>Search</Button>
            {can("SMS_TEMPLATES", "ADD") ? <Button onClick={openCreate}><FilePlus2 size={16} /> New Template</Button> : null}
          </div>
        </div>
        <div className="mt-5 flex min-h-0 flex-1 flex-col">
          <Table
            data={templatePage.records}
            emptyText="No SMS templates found."
            columns={[
              { key: "name", header: "Template Name", render: (item) => <span className="font-semibold text-slate-950">{item.templateName}</span> },
              { key: "body", header: "Body", render: (item) => <span className="line-clamp-2 text-slate-700">{item.templateBody}</span> },
              { key: "status", header: "Status", render: (item) => <StatusBadge label={item.active ? "Active" : "Inactive"} /> },
              { key: "created", header: "Created On", render: (item) => formatDate(item.createdAt) },
              {
                key: "actions",
                header: "Actions",
                className: "text-right",
                render: (item) => (
                  <ActionDropdown actions={[
                    { label: "Preview", icon: <Eye size={15} />, onClick: () => void openPreview(item) },
                    { label: "Edit", icon: <Pencil size={15} />, hidden: !can("SMS_TEMPLATES", "EDIT"), onClick: () => openEdit(item) },
                    { label: "Delete", icon: <CommonDeleteIcon />, hidden: !can("SMS_TEMPLATES", "DELETE"), danger: true, onClick: () => void deleteSmsTemplate(item.id).then(() => loadTemplates(templatePage.page)) }
                  ]} />
                )
              }
            ]}
          />
          <Pagination page={templatePage.page} size={templatePage.size} totalRecords={templatePage.totalRecords} totalPages={templatePage.totalPages} onPageChange={(nextPage) => void loadTemplates(nextPage)} />
        </div>
      </GlassCard>

      <Modal open={formOpen} title={editingTemplate ? "Edit SMS Template" : "Add SMS Template"} onClose={() => setFormOpen(false)}>
        <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <Input label="Template Name" value={form.templateName} onChange={(event) => setForm((current) => ({ ...current, templateName: event.target.value }))} requiredMark />
            <label className="block space-y-2">
              <span className="block text-sm font-semibold text-slate-700">Template Body <span className="ml-1 text-rose-400">*</span></span>
              <textarea className="min-h-[220px] w-full rounded-[var(--radius-control)] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[var(--theme-color)]" value={form.templateBody} onChange={(event) => setForm((current) => ({ ...current, templateBody: event.target.value }))} />
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
              Active template
            </label>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="button" disabled={!canSaveTemplate} onClick={() => void saveTemplate()}>{editingTemplate ? "Save Template" : "Create Template"}</Button>
            </div>
          </div>
          <div className="rounded-[var(--radius-card)] border border-slate-200 bg-slate-50 p-4">
            <p className="mb-4 font-semibold text-slate-950">Available Variables</p>
            <div className="space-y-2">
              {Object.entries(variables).map(([variable, description]) => (
                <button key={variable} type="button" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm" onClick={() => setForm((current) => ({ ...current, templateBody: `${current.templateBody} {{${variable}}}` }))}>
                  <span className="block font-semibold text-slate-900">{`{{${variable}}}`}</span>
                  <span className="text-xs text-slate-500">{description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(preview)} title="SMS Preview" onClose={() => setPreview(null)}>
        {preview ? <PreviewSurface className="text-sm leading-6">{preview.emailBody}</PreviewSurface> : null}
      </Modal>
    </div>
  );
};

const sampleVariables = {
  Customer_Name: "Mohd Wazid",
  Customer_Email: "customer@example.com",
  Customer_Mobile: "9876543210",
  Outstanding_Amount: "7,080.00",
  Invoice_Number: "INV-001",
  Invoice_Date: "2026-06-10",
  Invoice_Total: "10,000.00",
  Due_Date: "2026-06-17"
};

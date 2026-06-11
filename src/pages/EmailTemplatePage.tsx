import { useEffect, useRef, useState } from "react";
import { Eye, FilePlus2, Italic, Link, List, ListOrdered, Mail, Pencil, Trash2, Type } from "lucide-react";
import { ActionDropdown } from "../components/ActionDropdown";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { DEFAULT_PAGE_SIZE, Pagination } from "../components/Pagination";
import { PreviewSurface } from "../components/PreviewSurface";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import {
  createEmailTemplate,
  deleteEmailTemplate,
  getEmailTemplateVariables,
  getEmailTemplatesPage,
  previewEmailTemplate,
  updateEmailTemplate
} from "../api/emailTemplates";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";
import { formatDate } from "../lib/format";
import type { EmailPreview, EmailTemplate, EmailTemplateRequest, PageResponse } from "../types/api";

const emptyPage: PageResponse<EmailTemplate> = {
  records: [],
  page: 0,
  size: DEFAULT_PAGE_SIZE,
  totalRecords: 0,
  totalPages: 0
};

const defaultForm: EmailTemplateRequest = {
  templateName: "",
  subject: "",
  emailBody: "<p>Hello {{Customer_Name}},</p><p>Your outstanding amount is {{Outstanding_Amount}}.</p>",
  active: true
};

export const EmailTemplatePage = () => {
  const [templatePage, setTemplatePage] = useState<PageResponse<EmailTemplate>>(emptyPage);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState<EmailTemplateRequest>(defaultForm);
  const [preview, setPreview] = useState<EmailPreview | null>(null);
  const [previewTitle, setPreviewTitle] = useState("Email Preview");
  const [successToast, setSuccessToast] = useState("");
  const editorRef = useRef<HTMLDivElement | null>(null);
  const { can } = useAuth();
  const { message: errorToast, clearMessage, setApiError } = useApiMessage();

  const loadTemplates = async (nextPage = 0) => {
    setLoading(true);
    clearMessage();
    try {
      const data = await getEmailTemplatesPage({
        search: search.trim() || undefined,
        page: nextPage,
        size: DEFAULT_PAGE_SIZE
      });
      setTemplatePage(data);
    } catch (err: any) {
      setApiError(err, "Unable to load email templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplates(0);
    void getEmailTemplateVariables().then(setVariables).catch(() => setVariables({}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditingTemplate(null);
    setForm(defaultForm);
    setFormOpen(true);
  };

  const openEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setForm({
      templateName: template.templateName,
      subject: template.subject,
      emailBody: template.emailBody,
      active: template.active
    });
    setFormOpen(true);
  };

  const syncEditor = () => {
    if (editorRef.current) {
      setForm((current) => ({ ...current, emailBody: editorRef.current?.innerHTML ?? "" }));
    }
  };

  const runEditorCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncEditor();
  };

  const insertVariable = (variable: string) => {
    runEditorCommand("insertText", `{{${variable}}}`);
  };

  const saveTemplate = async () => {
    syncEditor();
    clearMessage();
    setSuccessToast("");
    try {
      const payload = {
        ...form,
        emailBody: editorRef.current?.innerHTML ?? form.emailBody
      };
      if (editingTemplate) {
        await updateEmailTemplate(editingTemplate.id, payload);
        setSuccessToast("Email template updated successfully.");
      } else {
        await createEmailTemplate(payload);
        setSuccessToast("Email template created successfully.");
      }
      setFormOpen(false);
      await loadTemplates(templatePage.page);
    } catch (err: any) {
      setApiError(err, "Unable to save email template");
    }
  };

  const removeTemplate = async (template: EmailTemplate) => {
    clearMessage();
    setSuccessToast("");
    try {
      await deleteEmailTemplate(template.id);
      setSuccessToast("Email template deleted successfully.");
      await loadTemplates(templatePage.page);
    } catch (err: any) {
      setApiError(err, "Unable to delete email template");
    }
  };

  const openPreview = async (template: EmailTemplate) => {
    clearMessage();
    try {
      const rendered = await previewEmailTemplate(template.id, {
        Customer_Name: "Mohd Wazid",
        Customer_Email: "customer@example.com",
        Outstanding_Amount: "7,080.00",
        Invoice_Number: "INV-001",
        Invoice_Date: "2026-06-10",
        Invoice_Total: "10,000.00",
        Due_Date: "2026-06-17"
      });
      setPreviewTitle(`${template.templateName} Preview`);
      setPreview(rendered);
    } catch (err: any) {
      setApiError(err, "Unable to preview email template");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col space-y-4 pb-6">
      <Header title="Email Templates" subtitle="Manage reusable reminder and invoice email templates with dynamic variables." />

      {errorToast ? (
        <div className="glass rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-700">
          {errorToast}
        </div>
      ) : null}
      {successToast ? (
        <div className="glass rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-700">
          {successToast}
        </div>
      ) : null}

      <GlassCard className="flex min-h-[640px] flex-1 flex-col p-6 md:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CommonBreadcrumb items={[{ label: "Email Templates" }]} />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              aria-label="Search email templates"
              placeholder="Search templates"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void loadTemplates(0);
                }
              }}
            />
            <Button variant="secondary" onClick={() => void loadTemplates(0)}>Search</Button>
            {can("EMAIL_TEMPLATES", "ADD") ? (
              <Button onClick={openCreate}><FilePlus2 size={16} /> New Template</Button>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex min-h-0 flex-1 flex-col">
          <Table
            data={templatePage.records}
            emptyText={loading ? "Loading email templates..." : "No email templates found."}
            emptyAction={can("EMAIL_TEMPLATES", "ADD") ? <Button type="button" onClick={openCreate}>Add Email Template</Button> : null}
            columns={[
              {
                key: "template",
                header: "Template Name",
                render: (item) => (
                  <div className="min-w-[220px]">
                    <p className="font-semibold text-slate-950">{item.templateName}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.createdBy ?? "system"}</p>
                  </div>
                )
              },
              { key: "subject", header: "Subject", render: (item) => <span className="text-slate-700">{item.subject}</span> },
              { key: "status", header: "Status", render: (item) => <StatusBadge label={item.active ? "Active" : "Inactive"} /> },
              { key: "created", header: "Created On", render: (item) => formatDate(item.createdAt) },
              {
                key: "actions",
                header: "Actions",
                className: "text-right",
                render: (item) => (
                  <ActionDropdown
                    actions={[
                      { label: "Preview", icon: <Eye size={15} />, onClick: () => void openPreview(item) },
                      { label: "Edit", icon: <Pencil size={15} />, hidden: !can("EMAIL_TEMPLATES", "EDIT"), onClick: () => openEdit(item) },
                      { label: "Delete", icon: <Trash2 size={15} />, hidden: !can("EMAIL_TEMPLATES", "DELETE"), danger: true, onClick: () => void removeTemplate(item) }
                    ]}
                  />
                )
              }
            ]}
          />
          <Pagination
            page={templatePage.page}
            size={templatePage.size}
            totalRecords={templatePage.totalRecords}
            totalPages={templatePage.totalPages}
            disabled={loading}
            onPageChange={(nextPage) => void loadTemplates(nextPage)}
          />
        </div>
      </GlassCard>

      <Modal open={formOpen} title={editingTemplate ? "Edit Email Template" : "Add Email Template"} onClose={() => setFormOpen(false)}>
        <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Template Name"
                value={form.templateName}
                onChange={(event) => setForm((current) => ({ ...current, templateName: event.target.value }))}
                requiredMark
              />
              <Input
                label="Subject"
                value={form.subject}
                onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                requiredMark
              />
            </div>
            <label className="block space-y-2">
              <span className="block text-sm font-semibold text-slate-700">Email Body <span className="ml-1 text-rose-400">*</span></span>
              <div className="rounded-[var(--radius-control)] border border-slate-200 bg-white">
                <div className="flex flex-wrap gap-2 border-b border-slate-200 p-2">
                  <Button type="button" variant="ghost" className="min-h-9 px-3 py-2" onClick={() => runEditorCommand("bold")}><Type size={15} /> Bold</Button>
                  <Button type="button" variant="ghost" className="min-h-9 px-3 py-2" onClick={() => runEditorCommand("italic")}><Italic size={15} /> Italic</Button>
                  <Button type="button" variant="ghost" className="min-h-9 px-3 py-2" onClick={() => runEditorCommand("insertUnorderedList")}><List size={15} /> List</Button>
                  <Button type="button" variant="ghost" className="min-h-9 px-3 py-2" onClick={() => runEditorCommand("insertOrderedList")}><ListOrdered size={15} /> Numbered</Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-9 px-3 py-2"
                    onClick={() => {
                      const url = window.prompt("Enter link URL");
                      if (url) {
                        runEditorCommand("createLink", url);
                      }
                    }}
                  >
                    <Link size={15} /> Link
                  </Button>
                </div>
                <div
                  key={editingTemplate?.id ?? "new-template"}
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="min-h-[260px] w-full overflow-y-auto px-4 py-3 text-sm leading-6 text-slate-900 outline-none"
                  dangerouslySetInnerHTML={{ __html: form.emailBody }}
                  onInput={syncEditor}
                />
              </div>
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-[var(--theme-color)]"
                checked={form.active}
                onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
              />
              Active template
            </label>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="button" onClick={() => void saveTemplate()}>{editingTemplate ? "Save Template" : "Create Template"}</Button>
            </div>
          </div>

          <div className="rounded-[var(--radius-card)] border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex items-center gap-2">
              <Mail size={17} className="text-[var(--theme-color)]" />
              <p className="font-semibold text-slate-950">Available Variables</p>
            </div>
            <div className="space-y-2">
              {Object.entries(variables).map(([variable, description]) => (
                <button
                  key={variable}
                  type="button"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm transition hover:border-[var(--theme-color)] hover:bg-[color-mix(in_srgb,var(--theme-color)_6%,white)]"
                  onClick={() => insertVariable(variable)}
                >
                  <span className="block font-semibold text-slate-900">{`{{${variable}}}`}</span>
                  <span className="text-xs text-slate-500">{description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(preview)} title={previewTitle} onClose={() => setPreview(null)}>
        {preview ? (
          <div className="space-y-4">
            <PreviewSurface>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Subject</p>
              <p className="mt-2 font-semibold">{preview.subject}</p>
            </PreviewSurface>
            <PreviewSurface>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Email Body</p>
              <div className="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: preview.emailBody }} />
            </PreviewSurface>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, FilePlus2, Italic, Link, List, ListOrdered, Mail, Pencil, Type } from "lucide-react";
import { ActionDropdown } from "../components/ActionDropdown";
import { AvailableVariablesPanel } from "../components/AvailableVariablesPanel";
import { Button } from "../components/Button";
import { applyVisibleColumns } from "../components/CommonColumnSelector";
import { CommonDeleteIcon } from "../components/CommonDeleteAction";
import { CommonDeleteModal } from "../components/CommonDeleteModal";
import { CommonListPage } from "../components/CommonListPage";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { PreviewSurface } from "../components/PreviewSurface";
import { StatusBadge } from "../components/StatusBadge";
import {
  createEmailTemplate,
  deleteEmailTemplate,
  getEmailTemplateVariables,
  getEmailTemplatesPage,
  previewEmailTemplate,
  updateEmailTemplate
} from "../api/emailTemplates";
import { useAuth } from "../context/AuthContext";
import { useAddEditForm } from "../hooks/useAddEditForm";
import { useApiMessage } from "../hooks/useApiFeedback";
import { useListPage } from "../hooks/useListPage";
import { useTextInputVariableInsertion } from "../hooks/useTextInputVariableInsertion";
import { formatDate } from "../lib/format";
import { sanitizeHtml, sanitizeLinkUrl } from "../lib/sanitizeHtml";
import { TEMPLATE_PREVIEW_VARIABLES } from "../lib/templatePreviewVariables";
import { notificationService } from "../services/notificationService";
import type { EmailPreview, EmailTemplate, EmailTemplateRequest } from "../types/api";

type EmailFilters = {
  search: string;
};

type FormState = {
  templateName: string;
  subject: string;
  emailBody: string;
  active: boolean;
};

type VariableTarget = "subject" | "emailBody";

const emptyForm: FormState = {
  templateName: "",
  subject: "",
  emailBody: "<p>Hello {{Customer_Name}},</p><p>Your outstanding amount is {{Outstanding_Amount}}.</p>",
  active: true
};

export const EmailTemplatePage = () => {
  const { can } = useAuth();
  const { clearMessage, setApiError } = useApiMessage();
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<EmailPreview | null>(null);
  const [previewTitle, setPreviewTitle] = useState("Email Preview");
  const editorRef = useRef<HTMLDivElement | null>(null);

  const list = useListPage<EmailTemplate, EmailFilters>({
    initialFilters: { search: "" },
    errorMessage: "Unable to load email templates",
    fetchPage: ({ page, size, search }) =>
      getEmailTemplatesPage({ search: search.trim() || undefined, page, size })
  });

  useEffect(() => {
    void getEmailTemplateVariables().then(setVariables).catch(() => setVariables({}));
  }, []);

  const form = useAddEditForm<EmailTemplate, FormState, EmailTemplateRequest>({
    emptyForm,
    entityName: "Email Template",
    errorMessage: "Unable to save email template",
    toFormValues: (template) => ({
      templateName: template.templateName,
      subject: template.subject,
      emailBody: template.emailBody,
      active: template.active
    }),
    buildRequest: (values) => ({
      ...values,
      emailBody: sanitizeHtml(editorRef.current?.innerHTML ?? values.emailBody)
    }),
    create: createEmailTemplate,
    update: updateEmailTemplate,
    remove: deleteEmailTemplate,
    onSaved: list.refreshTable
  });

  const [activeVariableTarget, setActiveVariableTarget] = useState<VariableTarget>("emailBody");
  const activeVariableTargetRef = useRef<VariableTarget>("emailBody");
  const subjectInsertion = useTextInputVariableInsertion<HTMLInputElement>(
    form.formValues.subject,
    (subject) => form.setFormValues((current) => ({ ...current, subject }))
  );

  const selectVariableTarget = (target: VariableTarget) => {
    activeVariableTargetRef.current = target;
    setActiveVariableTarget(target);
  };

  useEffect(() => {
    if (form.formOpen) {
      selectVariableTarget("emailBody");
    }
  }, [form.formOpen]);

  const canSaveTemplate = Boolean(form.formValues.templateName.trim() && form.formValues.subject.trim() && form.formValues.emailBody.trim());
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const templateColumns = useMemo(() => [
    {
      key: "template",
      header: "Template Name",
      render: (item: EmailTemplate) => (
        <div className="min-w-[220px]">
          <p className="font-semibold text-slate-950">{item.templateName}</p>
          <p className="mt-1 text-xs text-slate-500">{item.createdBy ?? "system"}</p>
        </div>
      )
    },
    { key: "subject", header: "Subject", render: (item: EmailTemplate) => <span className="text-slate-700">{item.subject}</span> },
    { key: "status", header: "Status", render: (item: EmailTemplate) => <StatusBadge label={item.active ? "Active" : "Inactive"} /> },
    { key: "created", header: "Created On", render: (item: EmailTemplate) => formatDate(item.createdAt) }
  ], []);
  const visibleTemplateColumns = useMemo(() => applyVisibleColumns(templateColumns, visibleColumns), [templateColumns, visibleColumns]);

  const syncEditor = () => {
    if (editorRef.current) {
      form.setFormValues((current) => ({ ...current, emailBody: editorRef.current?.innerHTML ?? "" }));
    }
  };

  const runEditorCommand = (command: string, value?: string) => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    const selection = window.getSelection();
    const hasSelectionInside = Boolean(selection && selection.rangeCount > 0 && editor.contains(selection.anchorNode));
    editor.focus();
    if (command === "insertText" && !hasSelectionInside && selection) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    document.execCommand(command, false, value);
    syncEditor();
  };

  const insertVariable = (variable: string) => {
    const token = `{{${variable}}}`;
    if (activeVariableTargetRef.current === "subject") {
      subjectInsertion.insert(token);
      return;
    }
    runEditorCommand("insertText", token);
  };

  const openPreview = async (template: EmailTemplate) => {
    clearMessage();
    try {
      const rendered = await previewEmailTemplate(template.id, TEMPLATE_PREVIEW_VARIABLES);
      setPreviewTitle(`${template.templateName} Preview`);
      setPreview(rendered);
    } catch (err: any) {
      setApiError(err, "Unable to preview email template");
    }
  };

  return (
    <CommonListPage<EmailTemplate, EmailFilters>
      pageTitle="Email Templates"
      pageSubtitle="Manage reusable reminder and invoice email templates with dynamic variables."
      list={list}
      searchPlaceholder="Search Email Template"
      toolbarButtons={can("EMAIL_TEMPLATES", "ADD") ? <Button onClick={() => form.openAddForm()}><FilePlus2 size={16} /> New Template</Button> : null}
      columnSelector={{ tableName: "EMAIL_TEMPLATES", columns: templateColumns, visible: visibleColumns, onChange: setVisibleColumns, lockedKeys: ["template"] }}
      tableColumns={[
        ...visibleTemplateColumns,
        {
          key: "actions",
          header: "Actions",
          className: "text-right",
          render: (item: EmailTemplate) => (
            <ActionDropdown
              actions={[
                { label: "Preview", icon: <Eye size={15} />, onClick: () => void openPreview(item) },
                { label: "Edit", icon: <Pencil size={15} />, hidden: !can("EMAIL_TEMPLATES", "EDIT"), onClick: () => form.openEditForm(item) },
                { label: "Delete", icon: <CommonDeleteIcon />, hidden: !can("EMAIL_TEMPLATES", "DELETE"), danger: true, onClick: () => form.askDelete(item) }
              ]}
            />
          )
        }
      ]}
      emptyMessage={list.loading ? "Loading email templates..." : "No email templates found."}
      fullHeight
      modals={
        <>
          <Modal open={form.formOpen} title={form.editingEntity ? "Edit Email Template" : "Add Email Template"} onClose={form.closeForm}>
            <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Template Name"
                    value={form.formValues.templateName}
                    onChange={(event) => form.setFormValues((current) => ({ ...current, templateName: event.target.value }))}
                    requiredMark
                  />
                  <Input
                    ref={subjectInsertion.inputRef}
                    label="Subject"
                    value={form.formValues.subject}
                    onChange={(event) => form.setFormValues((current) => ({ ...current, subject: event.target.value }))}
                    onFocus={() => selectVariableTarget("subject")}
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
                          const url = window.prompt("Enter link URL (https://...)");
                          const safeUrl = sanitizeLinkUrl(url);
                          if (safeUrl) {
                            runEditorCommand("createLink", safeUrl);
                          } else if (url) {
                            notificationService.showError("Only http/https links are allowed.");
                          }
                        }}
                      >
                        <Link size={15} /> Link
                      </Button>
                    </div>
                    <div
                      key={form.editingEntity?.id ?? "new-template"}
                      ref={editorRef}
                      contentEditable
                      suppressContentEditableWarning
                      className="min-h-[260px] w-full overflow-y-auto px-4 py-3 text-sm leading-6 text-slate-900 outline-none"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(form.formValues.emailBody) }}
                      onFocus={() => selectVariableTarget("emailBody")}
                      onInput={syncEditor}
                    />
                  </div>
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-[var(--theme-color)]"
                    checked={form.formValues.active}
                    onChange={(event) => form.setFormValues((current) => ({ ...current, active: event.target.checked }))}
                  />
                  Active template
                </label>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="secondary" onClick={form.closeForm}>Cancel</Button>
                  <Button type="button" disabled={form.saving || !canSaveTemplate} onClick={() => void form.saveForm()}>{form.editingEntity ? "Save Template" : "Create Template"}</Button>
                </div>
              </div>

              <AvailableVariablesPanel
                variables={variables}
                onInsert={insertVariable}
                targetLabel={activeVariableTarget === "subject" ? "Subject" : "Email Body"}
                icon={<Mail size={17} className="text-[var(--theme-color)]" />}
              />
            </div>
          </Modal>

          <Modal open={Boolean(preview)} title={previewTitle} onClose={() => setPreview(null)}>
            {preview ? (
              <div className="space-y-4">
                <PreviewSurface>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Subject</p>
                  <p className="mt-2 font-semibold">{preview.subject}</p>
                </PreviewSurface>
                <PreviewSurface>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Email Body</p>
                  <div className="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: sanitizeHtml(preview.emailBody) }} />
                </PreviewSurface>
              </div>
            ) : null}
          </Modal>
          <CommonDeleteModal
            open={Boolean(form.deleteTarget)}
            loading={form.deleting}
            title="Delete Email Template"
            description={form.deleteTarget ? `Delete "${form.deleteTarget.templateName}"? This cannot be undone.` : undefined}
            onCancel={form.cancelDelete}
            onConfirm={() => void form.confirmDelete()}
          />
        </>
      }
    />
  );
};

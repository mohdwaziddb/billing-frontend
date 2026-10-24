import { useEffect, useMemo, useState } from "react";
import { Eye, FilePlus2, Pencil } from "lucide-react";
import { createSmsTemplate, deleteSmsTemplate, getSmsTemplateVariables, getSmsTemplatesPage, previewSmsTemplate, updateSmsTemplate } from "../api/smsTemplates";
import { ActionDropdown } from "../components/ActionDropdown";
import { AvailableVariablesPanel } from "../components/AvailableVariablesPanel";
import { Button } from "../components/Button";
import { applyVisibleColumns } from "../components/CommonColumnSelector";
import { CommonDeleteIcon } from "../components/CommonDeleteAction";
import { CommonDeleteModal } from "../components/CommonDeleteModal";
import { CommonListPage } from "../components/CommonListPage";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { Select } from "../components/Select";
import { ModalFormActions } from "../components/ModalFormActions";
import { PreviewSurface } from "../components/PreviewSurface";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useAddEditForm } from "../hooks/useAddEditForm";
import { useApiMessage } from "../hooks/useApiFeedback";
import { useListPage } from "../hooks/useListPage";
import { useTextInputVariableInsertion } from "../hooks/useTextInputVariableInsertion";
import { formatDate } from "../lib/format";
import { TEMPLATE_PREVIEW_VARIABLES } from "../lib/templatePreviewVariables";
import type { EmailPreview, SmsTemplate, SmsTemplateRequest } from "../types/api";

type SmsFilters = {
  search: string;
  status: string;
};

type FormState = {
  templateName: string;
  templateBody: string;
  active: boolean;
};

const emptyForm: FormState = {
  templateName: "",
  templateBody: "Dear {{Customer_Name}}, your outstanding amount is {{Outstanding_Amount}}. - {{Company_Name}}",
  active: true
};

export const SmsTemplatePage = () => {
  const { can } = useAuth();
  const { setApiError } = useApiMessage();
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<EmailPreview | null>(null);

  const list = useListPage<SmsTemplate, SmsFilters>({
    initialFilters: { search: "", status: "active" },
    errorMessage: "Unable to load SMS templates",
    fetchPage: ({ page, size, search, filters }) =>
      getSmsTemplatesPage({ search: search.trim() || undefined, active: filters.status === "all" ? undefined : filters.status === "active", page, size })
  });

  useEffect(() => {
    void getSmsTemplateVariables().then(setVariables).catch(() => setVariables({}));
  }, []);

  const form = useAddEditForm<SmsTemplate, FormState, SmsTemplateRequest>({
    emptyForm,
    entityName: "SMS Template",
    errorMessage: "Unable to save SMS template",
    toFormValues: (template) => ({
      templateName: template.templateName,
      templateBody: template.templateBody,
      active: template.active
    }),
    buildRequest: (values) => ({
      templateName: values.templateName.trim(),
      templateBody: values.templateBody,
      active: values.active
    }),
    create: createSmsTemplate,
    update: updateSmsTemplate,
    remove: deleteSmsTemplate,
    onSaved: list.refreshTable
  });

  const bodyInsertion = useTextInputVariableInsertion<HTMLTextAreaElement>(
    form.formValues.templateBody,
    (templateBody) => form.setFormValues((current) => ({ ...current, templateBody }))
  );

  const insertVariable = (variable: string) => {
    bodyInsertion.insert(`{{${variable}}}`);
  };

  const canSaveTemplate = Boolean(form.formValues.templateName.trim() && form.formValues.templateBody.trim());
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const templateColumns = useMemo(() => [
    { key: "name", header: "Template Name", render: (item: SmsTemplate) => <span className="font-semibold text-slate-950">{item.templateName}</span> },
    { key: "body", header: "Body", render: (item: SmsTemplate) => <span className="line-clamp-2 text-slate-700">{item.templateBody}</span> },
    { key: "status", header: "Status", render: (item: SmsTemplate) => <StatusBadge label={item.active ? "ACTIVE" : "INACTIVE"} /> },
    { key: "created", header: "Created On", render: (item: SmsTemplate) => formatDate(item.createdAt) }
  ], []);
  const visibleTemplateColumns = useMemo(() => applyVisibleColumns(templateColumns, visibleColumns), [templateColumns, visibleColumns]);

  const openPreview = async (template: SmsTemplate) => {
    try {
      setPreview(await previewSmsTemplate(template.id, TEMPLATE_PREVIEW_VARIABLES));
    } catch (err: any) {
      setApiError(err, "Unable to preview SMS template");
    }
  };

  return (
    <CommonListPage<SmsTemplate, SmsFilters>
      pageTitle="SMS Templates"
      pageSubtitle="Manage reusable SMS templates with dynamic customer, invoice, and company variables."
      list={list}
      searchPlaceholder="Search SMS Template"
      // Baaki masters jaisa: default sirf Active (pehle inactive templates bhi mix me aate the).
      activeFilterCount={(filters) => (filters.status !== "active" ? 1 : 0)}
      filterFields={
        <Select
          label="Status Filter"
          placeholder={null}
          value={list.formFilters.status}
          onChange={(event) => list.updateFormFilters({ status: event.target.value })}
          options={[
            { label: "All Templates", value: "all" },
            { label: "Active Only", value: "active" },
            { label: "Inactive Only", value: "inactive" }
          ]}
        />
      }
      toolbarButtons={can("SMS_TEMPLATES", "ADD") ? <Button onClick={() => form.openAddForm()}><FilePlus2 size={16} /> New Template</Button> : null}
      columnSelector={{ tableName: "SMS_TEMPLATES", columns: templateColumns, visible: visibleColumns, onChange: setVisibleColumns, lockedKeys: ["name"] }}
      tableColumns={[
        ...visibleTemplateColumns,
        {
          key: "actions",
          header: "Actions",
          className: "text-right",
          render: (item: SmsTemplate) => (
            <ActionDropdown actions={[
              { label: "Preview", icon: <Eye size={15} />, onClick: () => void openPreview(item) },
              { label: "Edit", icon: <Pencil size={15} />, hidden: !can("SMS_TEMPLATES", "EDIT"), onClick: () => form.openEditForm(item) },
              { label: "Delete", icon: <CommonDeleteIcon />, hidden: !can("SMS_TEMPLATES", "DELETE") || !item.active, danger: true, onClick: () => form.askDelete(item) }
            ]} />
          )
        }
      ]}
      emptyMessage={list.loading ? "Loading SMS templates..." : "No SMS templates found."}
      fullHeight
      modals={
        <>
          <Modal open={form.formOpen} eyebrow="SMS Template" title={form.editingEntity ? "Edit SMS Template" : "Add SMS Template"} onClose={form.closeForm}>
            <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
              <div className="space-y-4">
                <Input label="Template Name" maxLength={150} value={form.formValues.templateName} onChange={(event) => form.setFormValues((current) => ({ ...current, templateName: event.target.value }))} requiredMark />
                <label className="block space-y-2">
                  <span className="block fs-12 font-semibold text-slate-700">Template Body<span className="ml-1 text-rose-400">*</span></span>
                  <textarea ref={bodyInsertion.inputRef} className="min-h-[220px] w-full rounded-[var(--radius-control)] border border-slate-200 bg-white px-3.5 py-2.5 fs-13 text-slate-900 outline-none focus:border-[var(--theme-color)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_14%,transparent)]" value={form.formValues.templateBody} onChange={(event) => form.setFormValues((current) => ({ ...current, templateBody: event.target.value }))} />
                  {/* Variables bharne ke baad asli length badlegi — ye sirf template text ka andaza hai. */}
                  <span className="block text-xs text-slate-500">
                    {form.formValues.templateBody.length} characters · about {Math.max(1, Math.ceil(form.formValues.templateBody.length / 160))} SMS part(s) before variables are filled
                  </span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={form.formValues.active} onChange={(event) => form.setFormValues((current) => ({ ...current, active: event.target.checked }))} />
                  Active template
                </label>
                <ModalFormActions editing={Boolean(form.editingEntity)} saving={form.saving} disabled={!canSaveTemplate} entityLabel="Template" onCancel={form.closeForm} onSave={() => void form.saveForm()} />
              </div>
              <AvailableVariablesPanel variables={variables} onInsert={insertVariable} />
            </div>
          </Modal>

          <Modal open={Boolean(preview)} eyebrow="Preview with sample data" title="SMS Preview" onClose={() => setPreview(null)} maxWidthClass="max-w-xl">
            {preview ? <PreviewSurface className="text-sm leading-6">{preview.emailBody}</PreviewSurface> : null}
          </Modal>
          <CommonDeleteModal
            open={Boolean(form.deleteTarget)}
            loading={form.deleting}
            title="Delete SMS Template"
            description={form.deleteTarget ? `Delete "${form.deleteTarget.templateName}"? This cannot be undone.` : undefined}
            onCancel={form.cancelDelete}
            onConfirm={() => void form.confirmDelete()}
          />
        </>
      }
    />
  );
};

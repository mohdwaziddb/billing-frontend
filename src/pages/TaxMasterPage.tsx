import { useMemo, useState } from "react";
import { Download, History, Pencil, Plus } from "lucide-react";
import { createTaxMaster, deleteTaxMaster, getTaxMasterPage, updateTaxMaster } from "../api/taxMaster";
import { ActionDropdown } from "../components/ActionDropdown";
import { AuditLogModal } from "../components/AuditLogModal";
import { Button } from "../components/Button";
import { applyVisibleColumns } from "../components/CommonColumnSelector";
import { CommonDeleteIcon } from "../components/CommonDeleteAction";
import { CommonDeleteModal } from "../components/CommonDeleteModal";
import { CommonListPage } from "../components/CommonListPage";
import { Input } from "../components/Input";
import { InfoNote } from "../components/InfoNote";
import { Modal } from "../components/Modal";
import { ModalFormActions } from "../components/ModalFormActions";
import { Select } from "../components/Select";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useAddEditForm } from "../hooks/useAddEditForm";
import { useListPage } from "../hooks/useListPage";
import { exportToExcel } from "../lib/excelExport";
import { formatDateTime } from "../lib/format";
import type { TaxMaster, TaxMasterRequest } from "../types/api";

type TaxFilters = {
  search: string;
  status: "all" | "active" | "inactive";
  taxType: string;
};

const emptyTaxFilters: TaxFilters = {
  search: "",
  status: "active",
  taxType: "all"
};

type FormState = {
  taxName: string;
  taxCode: string;
  taxType: string;
  rate: string;
  description: string;
  defaultTax: string;
  active: string;
};

const emptyForm: FormState = {
  taxName: "",
  taxCode: "",
  taxType: "GST",
  rate: "0",
  description: "",
  defaultTax: "false",
  active: "true"
};

const getRateError = (rate: string) => {
  const rateNumber = rate.trim() === "" ? NaN : Number(rate);
  if (!Number.isFinite(rateNumber)) {
    return "Enter a valid tax rate.";
  }
  if (rateNumber < 0 || rateNumber > 100) {
    return "Tax rate must be between 0 and 100.";
  }
  return null;
};

// Backend rule ke saath: default tax inactive nahi ho sakta (naye invoice par wahi lagta hai).
const getDefaultTaxError = (values: FormState) =>
  values.defaultTax === "true" && values.active === "false" ? "Default tax must be active. Set Status to Active or Default Tax to No." : null;

export const TaxMasterPage = () => {
  const { can } = useAuth();
  const canAdd = can("TAX_MASTER", "ADD");
  const canEdit = can("TAX_MASTER", "EDIT");
  const canDelete = can("TAX_MASTER", "DELETE");
  const canExport = can("TAX_MASTER", "EXPORT");
  const canViewLogs = can("TAX_MASTER", "LOGS");

  const list = useListPage<TaxMaster, TaxFilters>({
    initialFilters: emptyTaxFilters,
    errorMessage: "Unable to load tax masters",
    fetchPage: ({ page, size, search, filters }) =>
      getTaxMasterPage({
        search: search.trim() || undefined,
        active: filters.status === "active" ? true : filters.status === "inactive" ? false : undefined,
        taxType: filters.taxType === "all" ? undefined : filters.taxType,
        page,
        size
      })
  });

  const form = useAddEditForm<TaxMaster, FormState, TaxMasterRequest>({
    emptyForm,
    entityName: "Tax Master",
    errorMessage: "Unable to save tax master",
    validate: (values) => getRateError(values.rate) ?? getDefaultTaxError(values),
    toFormValues: (tax) => ({
      taxName: tax.taxName,
      taxCode: tax.taxCode,
      taxType: tax.taxType,
      rate: String(tax.rate),
      description: tax.description ?? "",
      defaultTax: tax.defaultTax ? "true" : "false",
      active: tax.active ? "true" : "false"
    }),
    buildRequest: (values) => ({
      taxName: values.taxName.trim(),
      taxCode: values.taxCode.trim(),
      taxType: values.taxType,
      rate: Number(values.rate),
      description: values.description.trim() || undefined,
      defaultTax: values.defaultTax === "true",
      active: values.active === "true"
    }),
    create: createTaxMaster,
    update: updateTaxMaster,
    remove: deleteTaxMaster,
    onSaved: list.refreshTable
  });

  const rateError = getRateError(form.formValues.rate);
  const defaultTaxError = getDefaultTaxError(form.formValues);
  const canSaveTax = Boolean(form.formValues.taxName.trim() && form.formValues.taxCode.trim() && rateError === null && defaultTaxError === null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const taxColumns = useMemo(() => [
    { key: "taxName", header: "Tax Name", render: (item: TaxMaster) => <span className="font-semibold text-white">{item.taxName}</span> },
    { key: "taxCode", header: "Tax Code", render: (item: TaxMaster) => item.taxCode },
    { key: "taxType", header: "Tax Type", render: (item: TaxMaster) => item.taxType.replace(/_/g, " ") },
    { key: "rate", header: "Rate", className: "text-right", render: (item: TaxMaster) => <span className="block text-right font-semibold">{item.rate}%</span> },
    { key: "defaultTax", header: "Default", render: (item: TaxMaster) => <StatusBadge label={item.defaultTax ? "DEFAULT" : "STANDARD"} /> },
    { key: "status", header: "Status", render: (item: TaxMaster) => <StatusBadge label={item.active ? "ACTIVE" : "INACTIVE"} /> },
    { key: "updatedAt", header: "Updated At", render: (item: TaxMaster) => formatDateTime(item.updatedAt) }
  ], []);
  const visibleTaxColumns = useMemo(() => applyVisibleColumns(taxColumns, visibleColumns), [taxColumns, visibleColumns]);

  return (
    <CommonListPage<TaxMaster, TaxFilters>
      pageTitle="Tax Master"
      pageSubtitle="Manage GST and future-ready tax definitions with company scoped controls, auditability, and export support."
      list={list}
      searchPlaceholder="Search Tax"
      activeFilterCount={(filters) => (filters.taxType !== "all" ? 1 : 0) + (filters.status !== "active" ? 1 : 0)}
      filterFields={
        <>
          <Select
            label="Tax Type"
            placeholder={null}
            value={list.formFilters.taxType}
            onChange={(event) => list.updateFormFilters({ taxType: event.target.value })}
            options={[
              { label: "All Types", value: "all" },
              { label: "GST", value: "GST" },
              { label: "VAT", value: "VAT" },
              { label: "Sales Tax", value: "SALES_TAX" }
            ]}
          />
          <Select
            label="Status Filter"
            placeholder={null}
            value={list.formFilters.status}
            onChange={(event) => list.updateFormFilters({ status: event.target.value as TaxFilters["status"] })}
            options={[
              { label: "All Taxes", value: "all" },
              { label: "Active Only", value: "active" },
              { label: "Inactive Only", value: "inactive" }
            ]}
          />
        </>
      }
      toolbarButtons={
        <>
          {canExport ? (
            <Button
              type="button"
              variant="secondary"
              disabled={!list.tableData.length}
              onClick={() =>
                exportToExcel("tax-master.xlsx", list.tableData, [
                  { key: "taxName", header: "Tax Name" },
                  { key: "taxCode", header: "Tax Code" },
                  { key: "taxType", header: "Tax Type" },
                  { key: "rate", header: "Rate", value: (row) => `${row.rate}%` },
                  { key: "defaultTax", header: "Default", value: (row) => (row.defaultTax ? "Yes" : "No") },
                  { key: "active", header: "Status", value: (row) => (row.active ? "Active" : "Inactive") },
                  { key: "createdAt", header: "Created At", type: "date" },
                  { key: "updatedAt", header: "Updated At", type: "date" },
                  { key: "createdBy", header: "Created By" },
                  { key: "updatedBy", header: "Updated By" }
                ])
              }
            >
              <Download size={16} />
              Export Excel
            </Button>
          ) : null}
          {canAdd ? <Button type="button" onClick={() => form.openAddForm()}><Plus size={16} />Add Tax</Button> : null}
        </>
      }
      columnSelector={{ tableName: "TAX_MASTER", columns: taxColumns, visible: visibleColumns, onChange: setVisibleColumns, lockedKeys: ["taxName"] }}
      tableColumns={[
        ...visibleTaxColumns,
        {
          key: "actions",
          header: "Actions",
          className: "text-right",
          render: (item: TaxMaster) => (
            <ActionDropdown
              actions={[
                { label: "Edit", icon: <Pencil size={15} />, hidden: !canEdit, onClick: () => form.openEditForm(item) },
                { label: "Show Logs", icon: <History size={15} />, hidden: !canViewLogs, onClick: () => form.openLogs(item) },
                { label: "Delete", icon: <CommonDeleteIcon />, danger: true, hidden: !canDelete || !item.active, onClick: () => form.askDelete(item) }
              ]}
            />
          )
        }
      ]}
      emptyMessage="No taxes found."
      fullHeight
      modals={
        <>
          <Modal open={form.formOpen} eyebrow="Tax Master" title={form.editingEntity ? "Edit Tax" : "Add Tax"} onClose={form.closeForm} maxWidthClass="max-w-3xl">
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Tax Name" requiredMark maxLength={100} placeholder="e.g. GST 18%" error={form.fieldErrors.taxName} value={form.formValues.taxName} onChange={(event) => form.setFormValues((current) => ({ ...current, taxName: event.target.value }))} />
              <Input label="Tax Code" requiredMark maxLength={40} placeholder="e.g. GST_18" error={form.fieldErrors.taxCode} value={form.formValues.taxCode} onChange={(event) => form.setFormValues((current) => ({ ...current, taxCode: event.target.value.toUpperCase() }))} />
              <Select
                label="Tax Type"
                placeholder={null}
                value={form.formValues.taxType}
                onChange={(event) => form.setFormValues((current) => ({ ...current, taxType: event.target.value }))}
                options={[
                  { label: "GST", value: "GST" },
                  { label: "VAT", value: "VAT" },
                  { label: "Sales Tax", value: "SALES_TAX" }
                ]}
              />
              <Input label="Rate (%)" requiredMark type="number" step="0.01" error={form.fieldErrors.rate ?? (form.formValues.rate.trim() !== "" ? rateError ?? undefined : undefined)} value={form.formValues.rate} onChange={(event) => form.setFormValues((current) => ({ ...current, rate: event.target.value }))} />
              <Select
                label="Default Tax"
                placeholder={null}
                hint="Default tax is pre-selected on new products and invoice lines."
                value={form.formValues.defaultTax}
                onChange={(event) => form.setFormValues((current) => ({ ...current, defaultTax: event.target.value }))}
                options={[
                  { label: "No", value: "false" },
                  { label: "Yes", value: "true" }
                ]}
              />
              <Select
                label="Status"
                placeholder={null}
                value={form.formValues.active}
                onChange={(event) => form.setFormValues((current) => ({ ...current, active: event.target.value }))}
                options={[
                  { label: "Active", value: "true" },
                  { label: "Inactive", value: "false" }
                ]}
              />
              <Input label="Description" className="md:col-span-2" maxLength={1000} error={form.fieldErrors.description} value={form.formValues.description} onChange={(event) => form.setFormValues((current) => ({ ...current, description: event.target.value }))} />
            </div>
            {defaultTaxError ? <InfoNote tone="warning" className="mt-4">{defaultTaxError}</InfoNote> : null}
            <ModalFormActions editing={Boolean(form.editingEntity)} saving={form.saving} disabled={!canSaveTax} entityLabel="Tax" onCancel={form.closeForm} onSave={() => void form.saveForm()} />
          </Modal>
          <AuditLogModal open={Boolean(form.logsTarget)} moduleName="Tax Master" entityId={form.logsTarget?.id ?? null} title={form.logsTarget ? `${form.logsTarget.taxName} Logs` : "Tax Logs"} onClose={form.closeLogs} />
          <CommonDeleteModal open={Boolean(form.deleteTarget)} itemName={form.deleteTarget?.taxName} description={form.deleteTarget?.defaultTax ? `"${form.deleteTarget.taxName}" is your default tax. After deleting it, no tax will be pre-selected until you mark another tax as default.` : undefined} loading={form.deleting} onCancel={form.cancelDelete} onConfirm={() => void form.confirmDelete()} />
        </>
      }
    />
  );
};

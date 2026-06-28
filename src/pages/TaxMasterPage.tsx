import { useEffect, useState } from "react";
import { Download, History, Pencil } from "lucide-react";
import { createTaxMaster, deleteTaxMaster, getTaxMasterPage, updateTaxMaster } from "../api/taxMaster";
import { ActionDropdown } from "../components/ActionDropdown";
import { AuditLogModal } from "../components/AuditLogModal";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { CommonDeleteIcon } from "../components/CommonDeleteAction";
import { CommonDeleteModal } from "../components/CommonDeleteModal";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { DEFAULT_PAGE_SIZE, Pagination } from "../components/Pagination";
import { Select } from "../components/Select";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { useApiFormFeedback, useApiMessage } from "../hooks/useApiFeedback";
import { CommonErrorMessageUtil } from "../lib/CommonErrorMessageUtil";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import { exportToExcel } from "../lib/excelExport";
import { formatDateTime } from "../lib/format";
import { notificationService } from "../services/notificationService";
import type { PageResponse, TaxMaster, TaxMasterRequest } from "../types/api";

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

const emptyPage: PageResponse<TaxMaster> = {
  records: [],
  page: 0,
  size: DEFAULT_PAGE_SIZE,
  totalRecords: 0,
  totalPages: 0
};

export const TaxMasterPage = () => {
  const { can } = useAuth();
  const [taxes, setTaxes] = useState<TaxMaster[]>([]);
  const [taxPage, setTaxPage] = useState<PageResponse<TaxMaster>>(emptyPage);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [taxTypeFilter, setTaxTypeFilter] = useState("all");
  const [editingTax, setEditingTax] = useState<TaxMaster | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TaxMaster | null>(null);
  const [logTarget, setLogTarget] = useState<TaxMaster | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { clearMessage, setApiError } = useApiMessage();
  const { fieldErrors, clearFeedback, applyApiError } = useApiFormFeedback();

  const canAdd = can("TAX_MASTER", "ADD");
  const canEdit = can("TAX_MASTER", "EDIT");
  const canDelete = can("TAX_MASTER", "DELETE");
  const canExport = can("TAX_MASTER", "EXPORT");
  const canViewLogs = can("TAX_MASTER", "LOGS");
  const canSaveTax = Boolean(form.taxName.trim() && form.taxCode.trim() && form.rate !== "");

  const loadTaxes = async (nextPage = page, searchOverride = search) => {
    const active = statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;
    const taxType = taxTypeFilter === "all" ? undefined : taxTypeFilter;
    const response = await getTaxMasterPage({ search: searchOverride.trim() || undefined, active, taxType, page: nextPage, size: DEFAULT_PAGE_SIZE });
    setTaxPage(response);
    setTaxes(response.records);
  };

  useEffect(() => {
    setPage(0);
    void loadTaxes(0).catch((err: any) => setApiError(err, "Unable to load tax masters"));
  }, [statusFilter, taxTypeFilter]);

  const openCreate = () => {
    setEditingTax(null);
    setForm(emptyForm);
    clearFeedback();
    setFormOpen(true);
  };

  const openEdit = (tax: TaxMaster) => {
    setEditingTax(tax);
    setForm({
      taxName: tax.taxName,
      taxCode: tax.taxCode,
      taxType: tax.taxType,
      rate: String(tax.rate),
      description: tax.description ?? "",
      defaultTax: tax.defaultTax ? "true" : "false",
      active: tax.active ? "true" : "false"
    });
    clearFeedback();
    setFormOpen(true);
  };

  const saveTax = async () => {
    clearFeedback();
    setSaving(true);
    const payload: TaxMasterRequest = {
      taxName: form.taxName.trim(),
      taxCode: form.taxCode.trim(),
      taxType: form.taxType,
      rate: Number(form.rate || 0),
      description: form.description.trim() || undefined,
      defaultTax: form.defaultTax === "true",
      active: form.active === "true"
    };
    try {
      if (editingTax) {
        await updateTaxMaster(editingTax.id, payload);
        notificationService.showSuccess(CommonSuccessMessageUtil.updated("Tax Master"));
      } else {
        await createTaxMaster(payload);
        notificationService.showSuccess(CommonSuccessMessageUtil.created("Tax Master"));
      }
      setFormOpen(false);
      clearMessage();
      await loadTaxes(page);
    } catch (err: any) {
      applyApiError(err, "Unable to save tax master");
    } finally {
      setSaving(false);
    }
  };

  const removeTax = async () => {
    if (!deleteTarget) {
      return;
    }
    try {
      setDeleting(true);
      await deleteTaxMaster(deleteTarget.id);
      clearMessage();
      await loadTaxes(page);
      setDeleteTarget(null);
      notificationService.showSuccess(CommonSuccessMessageUtil.deleted("Tax Master"));
    } catch (err: any) {
      setApiError(err, CommonErrorMessageUtil.deleteFailed);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col space-y-4 pb-6">
      <Header title="Tax Master" subtitle="Manage GST and future-ready tax definitions with company scoped controls, auditability, and export support." />
      <GlassCard className="flex flex-1 flex-col p-6 md:p-7">
        <div className="mb-5 flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CommonBreadcrumb items={[{ label: "Setup" }, { label: "Tax Master" }]} />
            <div className="flex flex-wrap gap-2">
              {canExport ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!taxes.length}
                  onClick={() => exportToExcel("tax-master.xlsx", taxes, [
                    { key: "taxName", header: "Tax Name" },
                    { key: "taxCode", header: "Tax Code" },
                    { key: "taxType", header: "Tax Type" },
                    { key: "rate", header: "Rate", value: (row) => `${row.rate}%` },
                    { key: "defaultTax", header: "Default", value: (row) => row.defaultTax ? "Yes" : "No" },
                    { key: "active", header: "Status", value: (row) => row.active ? "Active" : "Inactive" },
                    { key: "createdAt", header: "Created At", type: "date" },
                    { key: "updatedAt", header: "Updated At", type: "date" },
                    { key: "createdBy", header: "Created By" },
                    { key: "updatedBy", header: "Updated By" }
                  ])}
                >
                  <Download size={16} />
                  Export Excel
                </Button>
              ) : null}
              {canAdd ? <Button onClick={openCreate}>Add Tax</Button> : null}
            </div>
          </div>
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px_160px]">
            <Input
              label="Search Tax"
              placeholder="Search by tax name or code"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClear={() => {
                setPage(0);
                setSearch("");
                void loadTaxes(0, "");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  setPage(0);
                  void loadTaxes(0);
                }
              }}
            />
            <Select
              label="Tax Type"
              placeholder={null}
              value={taxTypeFilter}
              onChange={(event) => setTaxTypeFilter(event.target.value)}
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
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              options={[
                { label: "All Taxes", value: "all" },
                { label: "Active Only", value: "active" },
                { label: "Inactive Only", value: "inactive" }
              ]}
            />
            <div className="flex items-end">
              <Button className="w-full" variant="secondary" onClick={() => { setPage(0); void loadTaxes(0); }}>
                Search
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <Table
            data={taxes}
            emptyText="No tax masters found."
            emptyAction={canAdd ? <Button onClick={openCreate}>Add Tax</Button> : null}
            columns={[
              { key: "taxName", header: "Tax Name", render: (item) => <span className="font-semibold text-white">{item.taxName}</span> },
              { key: "taxCode", header: "Tax Code", render: (item) => item.taxCode },
              { key: "taxType", header: "Tax Type", render: (item) => item.taxType.replace(/_/g, " ") },
              { key: "rate", header: "Rate", className: "text-right", render: (item) => <span className="block text-right font-semibold">{item.rate}%</span> },
              { key: "defaultTax", header: "Default", render: (item) => <StatusBadge label={item.defaultTax ? "DEFAULT" : "STANDARD"} /> },
              { key: "status", header: "Status", render: (item) => <StatusBadge label={item.active ? "ACTIVE" : "INACTIVE"} /> },
              { key: "updatedAt", header: "Updated At", render: (item) => formatDateTime(item.updatedAt) },
              {
                key: "actions",
                header: "Actions",
                className: "text-right",
                render: (item) => (
                  <ActionDropdown
                    actions={[
                      { label: "Edit", icon: <Pencil size={15} />, hidden: !canEdit, onClick: () => openEdit(item) },
                      { label: "Show Logs", icon: <History size={15} />, hidden: !canViewLogs, onClick: () => setLogTarget(item) },
                      { label: "Delete", icon: <CommonDeleteIcon />, danger: true, hidden: !canDelete, onClick: () => setDeleteTarget(item) }
                    ]}
                  />
                )
              }
            ]}
          />
        </div>
        <div className="mt-auto">
          <Pagination
            page={taxPage.page}
            size={taxPage.size}
            totalRecords={taxPage.totalRecords}
            totalPages={taxPage.totalPages}
            onPageChange={(nextPage) => {
              setPage(nextPage);
              void loadTaxes(nextPage);
            }}
          />
        </div>
      </GlassCard>

      <Modal open={formOpen} title={editingTax ? "Edit Tax" : "Add Tax"} onClose={() => setFormOpen(false)}>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Tax Name" requiredMark error={fieldErrors.taxName} value={form.taxName} onChange={(event) => setForm((current) => ({ ...current, taxName: event.target.value }))} />
          <Input label="Tax Code" requiredMark error={fieldErrors.taxCode} value={form.taxCode} onChange={(event) => setForm((current) => ({ ...current, taxCode: event.target.value.toUpperCase() }))} />
          <Select
            label="Tax Type"
            placeholder={null}
            value={form.taxType}
            onChange={(event) => setForm((current) => ({ ...current, taxType: event.target.value }))}
            options={[
              { label: "GST", value: "GST" },
              { label: "VAT", value: "VAT" },
              { label: "Sales Tax", value: "SALES_TAX" }
            ]}
          />
          <Input label="Rate (%)" requiredMark type="number" step="0.01" error={fieldErrors.rate} value={form.rate} onChange={(event) => setForm((current) => ({ ...current, rate: event.target.value }))} />
          <Select
            label="Default Tax"
            placeholder={null}
            value={form.defaultTax}
            onChange={(event) => setForm((current) => ({ ...current, defaultTax: event.target.value }))}
            options={[
              { label: "No", value: "false" },
              { label: "Yes", value: "true" }
            ]}
          />
          <Select
            label="Status"
            placeholder={null}
            value={form.active}
            onChange={(event) => setForm((current) => ({ ...current, active: event.target.value }))}
            options={[
              { label: "Active", value: "true" },
              { label: "Inactive", value: "false" }
            ]}
          />
          <Input label="Description" className="md:col-span-2" error={fieldErrors.description} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button disabled={saving || !canSaveTax} onClick={() => void saveTax()}>
            {saving ? "Saving..." : editingTax ? "Update Tax" : "Create Tax"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
            Cancel
          </Button>
        </div>
      </Modal>

      <AuditLogModal open={Boolean(logTarget)} moduleName="Tax Master" entityId={logTarget?.id ?? null} title={logTarget ? `${logTarget.taxName} Logs` : "Tax Logs"} onClose={() => setLogTarget(null)} />
      <CommonDeleteModal open={Boolean(deleteTarget)} loading={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void removeTax()} />
    </div>
  );
};

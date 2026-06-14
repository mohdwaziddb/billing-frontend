import { useEffect, useState } from "react";
import { Edit3, History, Plus } from "lucide-react";
import { createPaymentMode, deletePaymentMode, getPaymentModesPage, updatePaymentMode } from "../api/paymentModes";
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
import { notificationService } from "../services/notificationService";
import type { PageResponse, PaymentModeMaster } from "../types/api";

const emptyPage: PageResponse<PaymentModeMaster> = {
  records: [],
  page: 0,
  size: DEFAULT_PAGE_SIZE,
  totalRecords: 0,
  totalPages: 0
};

const emptyForm = { modeName: "", description: "", active: "true" };

export const PaymentModePage = () => {
  const [modePage, setModePage] = useState<PageResponse<PaymentModeMaster>>(emptyPage);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("true");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentModeMaster | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PaymentModeMaster | null>(null);
  const [logTarget, setLogTarget] = useState<PaymentModeMaster | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const { can } = useAuth();
  const { setApiError } = useApiMessage();
  const { fieldErrors, clearFeedback, applyApiError } = useApiFormFeedback();
  const canSaveMode = Boolean(form.modeName.trim());

  const loadModes = async (nextPage = page) => {
    const response = await getPaymentModesPage({
      search: search.trim() || undefined,
      active: activeFilter === "" ? undefined : activeFilter === "true",
      page: nextPage,
      size: DEFAULT_PAGE_SIZE
    });
    setModePage(response);
  };

  useEffect(() => {
    setPage(0);
    void loadModes(0).catch((err: any) => setApiError(err, "Unable to load payment modes"));
  }, [search, activeFilter]);

  const openCreate = () => {
    clearFeedback();
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (mode: PaymentModeMaster) => {
    clearFeedback();
    setEditing(mode);
    setForm({ modeName: mode.modeName, description: mode.description ?? "", active: mode.active ? "true" : "false" });
    setFormOpen(true);
  };

  const saveMode = async () => {
    clearFeedback();
    setSaving(true);
    try {
      const payload = {
        modeName: form.modeName.trim(),
        description: form.description.trim() || undefined,
        active: form.active === "true"
      };
      if (editing) {
        await updatePaymentMode(editing.id, payload);
        notificationService.showSuccess(CommonSuccessMessageUtil.updated("Payment Mode"));
      } else {
        await createPaymentMode(payload);
        notificationService.showSuccess(CommonSuccessMessageUtil.created("Payment Mode"));
      }
      setFormOpen(false);
      await loadModes(editing ? page : 0);
    } catch (err: any) {
      applyApiError(err, "Unable to save payment mode");
    } finally {
      setSaving(false);
    }
  };

  const removeMode = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePaymentMode(deleteTarget.id);
      notificationService.showSuccess(CommonSuccessMessageUtil.deleted("Payment Mode"));
      setDeleteTarget(null);
      await loadModes(page);
    } catch (err: any) {
      setApiError(err, CommonErrorMessageUtil.deleteFailed);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col space-y-4 pb-6">
      <Header title="Payment Modes" subtitle="Manage company payment methods used in payment entry and hierarchy reports." />

      <GlassCard className="flex flex-1 flex-col p-6 md:p-7">
        <div className="mb-5 flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CommonBreadcrumb items={[{ label: "Setup" }, { label: "Payment Modes" }]} />
            <div className="flex flex-wrap gap-2">
              {can("PAYMENT_MODES", "ADD") ? (
                <Button type="button" onClick={openCreate}>
                  <Plus size={16} />
                  Add Payment Mode
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <Input
              label="Search Payment Mode"
              placeholder="Search by mode name or code"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClear={() => setSearch("")}
            />
            <Select
              label="Status"
              value={activeFilter}
              options={[
                { label: "All Modes", value: "" },
                { label: "Active Only", value: "true" },
                { label: "Inactive Only", value: "false" }
              ]}
              onChange={(event) => setActiveFilter(event.target.value)}
            />
          </div>
        </div>

        <Table
          data={modePage.records}
          emptyText="No payment modes found."
          columns={[
            { key: "modeName", header: "Payment Mode", render: (item) => <span className="font-semibold text-white">{item.modeName}</span> },
            { key: "modeCode", header: "Code", render: (item) => item.modeCode },
            { key: "description", header: "Description", render: (item) => item.description ?? "--" },
            { key: "status", header: "Status", render: (item) => <StatusBadge label={item.active ? "Active" : "Inactive"} /> },
            {
              key: "actions",
              header: "Actions",
              className: "text-right",
              render: (item) => (
                <ActionDropdown
                  actions={[
                    { label: "Edit", icon: <Edit3 size={15} />, hidden: !can("PAYMENT_MODES", "EDIT"), onClick: () => openEdit(item) },
                    { label: "Show Logs", icon: <History size={15} />, hidden: !can("PAYMENT_MODES", "LOGS"), onClick: () => setLogTarget(item) },
                    { label: "Delete", icon: <CommonDeleteIcon />, danger: true, hidden: !can("PAYMENT_MODES", "DELETE"), onClick: () => setDeleteTarget(item) }
                  ]}
                />
              )
            }
          ]}
        />

        <div className="mt-auto pt-4">
          <Pagination page={modePage.page} size={modePage.size} totalRecords={modePage.totalRecords} totalPages={modePage.totalPages} onPageChange={(nextPage) => {
            setPage(nextPage);
            void loadModes(nextPage);
          }} />
        </div>
      </GlassCard>

      <Modal open={formOpen} title={editing ? "Edit Payment Mode" : "Add Payment Mode"} onClose={() => setFormOpen(false)} maxWidthClass="max-w-2xl">
        <div className="grid gap-4">
          <Input label="Payment Mode" requiredMark error={fieldErrors.modeName} value={form.modeName} onChange={(event) => setForm((current) => ({ ...current, modeName: event.target.value }))} />
          <Input label="Description" error={fieldErrors.description} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          <Select label="Status" value={form.active} options={[{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }]} onChange={(event) => setForm((current) => ({ ...current, active: event.target.value }))} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="button" disabled={saving || !canSaveMode} onClick={() => void saveMode()}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </Modal>

      <AuditLogModal open={Boolean(logTarget)} moduleName="Payment Mode" entityId={logTarget?.id ?? null} title={logTarget ? `${logTarget.modeName} Logs` : "Payment Mode Logs"} onClose={() => setLogTarget(null)} />
      <CommonDeleteModal open={Boolean(deleteTarget)} loading={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void removeMode()} />
    </div>
  );
};

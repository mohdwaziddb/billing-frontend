import { useMemo, useState } from "react";
import { Edit3, History, Plus } from "lucide-react";
import { createPaymentMode, deletePaymentMode, getPaymentModesPage, updatePaymentMode } from "../api/paymentModes";
import { ActionDropdown } from "../components/ActionDropdown";
import { AuditLogModal } from "../components/AuditLogModal";
import { Button } from "../components/Button";
import { applyVisibleColumns } from "../components/CommonColumnSelector";
import { CommonDeleteIcon } from "../components/CommonDeleteAction";
import { CommonDeleteModal } from "../components/CommonDeleteModal";
import { CommonListPage } from "../components/CommonListPage";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { Select } from "../components/Select";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useAddEditForm } from "../hooks/useAddEditForm";
import { useListPage } from "../hooks/useListPage";
import type { PaymentModeMaster, PaymentModeRequest } from "../types/api";

type PaymentModeFilters = {
  search: string;
  status: string;
};

type FormState = {
  modeName: string;
  description: string;
  active: string;
};

const emptyFilters: PaymentModeFilters = {
  search: "",
  status: "true"
};

const emptyForm: FormState = {
  modeName: "",
  description: "",
  active: "true"
};

export const PaymentModePage = () => {
  const { can } = useAuth();

  const list = useListPage<PaymentModeMaster, PaymentModeFilters>({
    initialFilters: emptyFilters,
    errorMessage: "Unable to load payment modes",
    fetchPage: ({ page, size, search, filters }) =>
      getPaymentModesPage({
        search: search.trim() || undefined,
        active: filters.status === "" ? undefined : filters.status === "true",
        page,
        size
      })
  });

  const form = useAddEditForm<PaymentModeMaster, FormState, PaymentModeRequest>({
    emptyForm,
    entityName: "Payment Mode",
    errorMessage: "Unable to save payment mode",
    toFormValues: (mode) => ({
      modeName: mode.modeName,
      description: mode.description ?? "",
      active: mode.active ? "true" : "false"
    }),
    buildRequest: (values) => ({
      modeName: values.modeName.trim(),
      description: values.description.trim() || undefined,
      active: values.active === "true"
    }),
    create: createPaymentMode,
    update: updatePaymentMode,
    remove: deletePaymentMode,
    onSaved: ({ wasEditing, wasDelete }) => {
      if (wasEditing || wasDelete) {
        list.refreshTable();
      } else {
        list.goToPage(0);
      }
    }
  });

  const canSaveMode = Boolean(form.formValues.modeName.trim());
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const paymentModeColumns = useMemo(() => [
    { key: "modeName", header: "Payment Mode", render: (item: PaymentModeMaster) => <span className="font-semibold text-white">{item.modeName}</span> },
    { key: "modeCode", header: "Code", render: (item: PaymentModeMaster) => item.modeCode },
    { key: "description", header: "Description", render: (item: PaymentModeMaster) => item.description ?? "--" },
    { key: "status", header: "Status", render: (item: PaymentModeMaster) => <StatusBadge label={item.active ? "Active" : "Inactive"} /> }
  ], []);
  const visiblePaymentModeColumns = useMemo(() => applyVisibleColumns(paymentModeColumns, visibleColumns), [paymentModeColumns, visibleColumns]);

  return (
    <CommonListPage<PaymentModeMaster, PaymentModeFilters>
      pageTitle="Payment Modes"
      pageSubtitle="Manage company payment methods used in payment entry and hierarchy reports."
      list={list}
      liveSearch
      searchPlaceholder="Search Payment Mode"
      activeFilterCount={(filters) => (filters.status !== "true" ? 1 : 0)}
      filterFields={
        <Select
          label="Status"
          value={list.formFilters.status}
          onChange={(event) => list.updateFormFilters({ status: event.target.value })}
          options={[
            { label: "All Modes", value: "" },
            { label: "Active Only", value: "true" },
            { label: "Inactive Only", value: "false" }
          ]}
        />
      }
      toolbarButtons={
        can("PAYMENT_MODES", "ADD") ? (
          <Button type="button" onClick={() => form.openAddForm()}>
            <Plus size={16} />
            Add Payment Mode
          </Button>
        ) : null
      }
      columnSelector={{ tableName: "PAYMENT_MODES", columns: paymentModeColumns, visible: visibleColumns, onChange: setVisibleColumns, lockedKeys: ["modeName"] }}
      tableColumns={[
        ...visiblePaymentModeColumns,
        {
          key: "actions",
          header: "Actions",
          className: "text-right",
          render: (item: PaymentModeMaster) => (
            <ActionDropdown
              actions={[
                { label: "Edit", icon: <Edit3 size={15} />, hidden: !can("PAYMENT_MODES", "EDIT"), onClick: () => form.openEditForm(item) },
                { label: "Show Logs", icon: <History size={15} />, hidden: !can("PAYMENT_MODES", "LOGS"), onClick: () => form.openLogs(item) },
                { label: "Delete", icon: <CommonDeleteIcon />, danger: true, hidden: !can("PAYMENT_MODES", "DELETE"), onClick: () => form.askDelete(item) }
              ]}
            />
          )
        }
      ]}
      emptyMessage="No payment modes found."
      fullHeight
      modals={
        <>
          <Modal open={form.formOpen} title={form.editingEntity ? "Edit Payment Mode" : "Add Payment Mode"} onClose={form.closeForm} maxWidthClass="max-w-2xl">
            <div className="grid gap-4">
              <Input label="Payment Mode" requiredMark error={form.fieldErrors.modeName} value={form.formValues.modeName} onChange={(event) => form.setFormValues((current) => ({ ...current, modeName: event.target.value }))} />
              <Input label="Description" error={form.fieldErrors.description} value={form.formValues.description} onChange={(event) => form.setFormValues((current) => ({ ...current, description: event.target.value }))} />
              <Select label="Status" value={form.formValues.active} options={[{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }]} onChange={(event) => form.setFormValues((current) => ({ ...current, active: event.target.value }))} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={form.closeForm}>Cancel</Button>
                <Button type="button" disabled={form.saving || !canSaveMode} onClick={() => void form.saveForm()}>{form.saving ? "Saving..." : "Save"}</Button>
              </div>
            </div>
          </Modal>
          <AuditLogModal open={Boolean(form.logsTarget)} moduleName="Payment Mode" entityId={form.logsTarget?.id ?? null} title={form.logsTarget ? `${form.logsTarget.modeName} Logs` : "Payment Mode Logs"} onClose={form.closeLogs} />
          <CommonDeleteModal open={Boolean(form.deleteTarget)} loading={form.deleting} onCancel={form.cancelDelete} onConfirm={() => void form.confirmDelete()} />
        </>
      }
    />
  );
};

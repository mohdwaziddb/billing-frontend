import { useMemo, useState } from "react";
import { Download, History, Pencil, Plus } from "lucide-react";
import { createExpenseCategory, deleteExpenseCategory, getExpenseCategoriesPage, updateExpenseCategory } from "../api/expenseCategories";
import { ActionDropdown } from "../components/ActionDropdown";
import { AuditLogModal } from "../components/AuditLogModal";
import { Button } from "../components/Button";
import { applyVisibleColumns } from "../components/CommonColumnSelector";
import { CommonDeleteIcon } from "../components/CommonDeleteAction";
import { CommonDeleteModal } from "../components/CommonDeleteModal";
import { CommonListPage } from "../components/CommonListPage";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { ModalFormActions } from "../components/ModalFormActions";
import { Select } from "../components/Select";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useAddEditForm } from "../hooks/useAddEditForm";
import { useListPage } from "../hooks/useListPage";
import { exportToExcel } from "../lib/excelExport";
import { formatDateTime } from "../lib/format";
import type { ExpenseCategory, ExpenseCategoryRequest } from "../types/api";

type CategoryFilters = {
  search: string;
  status: string;
};

type FormState = {
  categoryName: string;
  description: string;
  active: string;
};

const emptyFilters: CategoryFilters = {
  search: "",
  status: "active"
};

const emptyForm: FormState = {
  categoryName: "",
  description: "",
  active: "true"
};

export const ExpenseCategoryPage = () => {
  const { can } = useAuth();
  const canAdd = can("EXPENSE_CATEGORIES", "ADD");
  const canEdit = can("EXPENSE_CATEGORIES", "EDIT");
  const canDelete = can("EXPENSE_CATEGORIES", "DELETE");
  const canExport = can("EXPENSE_CATEGORIES", "EXPORT");

  const list = useListPage<ExpenseCategory, CategoryFilters>({
    initialFilters: emptyFilters,
    errorMessage: "Unable to load expense categories",
    fetchPage: ({ page, size, search, filters }) =>
      getExpenseCategoriesPage({
        search: search.trim() || undefined,
        active: filters.status === "active" ? true : filters.status === "inactive" ? false : undefined,
        page,
        size
      })
  });

  const form = useAddEditForm<ExpenseCategory, FormState, ExpenseCategoryRequest>({
    emptyForm,
    entityName: "Expense Category",
    errorMessage: "Unable to save expense category",
    toFormValues: (category) => ({
      categoryName: category.categoryName,
      description: category.description ?? "",
      active: category.active ? "true" : "false"
    }),
    buildRequest: (values) => ({
      categoryName: values.categoryName.trim(),
      description: values.description.trim() || undefined,
      active: values.active === "true"
    }),
    create: createExpenseCategory,
    update: updateExpenseCategory,
    remove: deleteExpenseCategory,
    onSaved: list.refreshTable
  });

  const canSaveCategory = Boolean(form.formValues.categoryName.trim());
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const categoryColumns = useMemo(() => [
    { key: "name", header: "Category", render: (item: ExpenseCategory) => <span className="font-semibold text-white">{item.categoryName}</span> },
    { key: "description", header: "Description", render: (item: ExpenseCategory) => item.description ?? "--" },
    { key: "status", header: "Status", render: (item: ExpenseCategory) => <StatusBadge label={item.active ? "ACTIVE" : "INACTIVE"} /> },
    { key: "updated", header: "Updated At", render: (item: ExpenseCategory) => formatDateTime(item.updatedAt) }
  ], []);
  const visibleCategoryColumns = useMemo(() => applyVisibleColumns(categoryColumns, visibleColumns), [categoryColumns, visibleColumns]);

  return (
    <CommonListPage<ExpenseCategory, CategoryFilters>
      pageTitle="Expense Categories"
      pageSubtitle="Owner-managed category setup for profit, reporting, and analytics."
      list={list}
      searchPlaceholder="Search Category"
      activeFilterCount={(filters) => (filters.status !== "active" ? 1 : 0)}
      filterFields={
        <Select
          label="Status Filter"
          placeholder={null}
          value={list.formFilters.status}
          onChange={(event) => list.updateFormFilters({ status: event.target.value })}
          options={[
            { label: "All Categories", value: "all" },
            { label: "Active Only", value: "active" },
            { label: "Inactive Only", value: "inactive" }
          ]}
        />
      }
      toolbarButtons={
        <>
          {canExport ? (
            <Button
              type="button"
              variant="secondary"
              disabled={!list.tableData.length}
              onClick={() =>
                exportToExcel("expense-categories.xlsx", list.tableData, [
                  { key: "categoryName", header: "Category Name" },
                  { key: "description", header: "Description" },
                  { key: "active", header: "Status", value: (row) => (row.active ? "Active" : "Inactive") },
                  { key: "createdAt", header: "Created At", type: "date" },
                  { key: "updatedAt", header: "Updated At", type: "date" }
                ])
              }
            >
              <Download size={16} />
              Export Excel
            </Button>
          ) : null}
          {canAdd ? <Button type="button" onClick={() => form.openAddForm()}><Plus size={16} />Add Category</Button> : null}
        </>
      }
      columnSelector={{ tableName: "EXPENSE_CATEGORIES", columns: categoryColumns, visible: visibleColumns, onChange: setVisibleColumns, lockedKeys: ["name"] }}
      tableColumns={[
        ...visibleCategoryColumns,
        {
          key: "actions",
          header: "Actions",
          className: "text-right",
          render: (item: ExpenseCategory) => (
            <ActionDropdown
              actions={[
                {
                  label: "Edit",
                  icon: <Pencil size={15} />,
                  hidden: !canEdit,
                  onClick: () => form.openEditForm(item)
                },
                {
                  label: "Show Logs",
                  icon: <History size={15} />,
                  hidden: !can("EXPENSE_CATEGORIES", "LOGS"),
                  onClick: () => form.openLogs(item)
                },
                {
                  label: "Delete",
                  icon: <CommonDeleteIcon />,
                  danger: true,
                  // Inactive record pehle se "deleted" (soft delete) hai — dobara Delete ka matlab nahi.
                  hidden: !canDelete || !item.active,
                  onClick: () => form.askDelete(item)
                }
              ]}
            />
          )
        }
      ]}
      emptyMessage="No expense categories found."
      fullHeight
      modals={
        <>
          <Modal open={form.formOpen} eyebrow="Expense Category" title={form.editingEntity ? "Edit Expense Category" : "Add Expense Category"} onClose={form.closeForm} maxWidthClass="max-w-2xl">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Category Name"
                requiredMark
                maxLength={100}
                error={form.fieldErrors.categoryName}
                value={form.formValues.categoryName}
                onChange={(event) => form.setFormValues((current) => ({ ...current, categoryName: event.target.value }))}
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
              <Input
                label="Description"
                className="md:col-span-2"
                maxLength={1000}
                error={form.fieldErrors.description}
                value={form.formValues.description}
                onChange={(event) => form.setFormValues((current) => ({ ...current, description: event.target.value }))}
              />
            </div>
            <ModalFormActions editing={Boolean(form.editingEntity)} saving={form.saving} disabled={!canSaveCategory} entityLabel="Category" onCancel={form.closeForm} onSave={() => void form.saveForm()} />
          </Modal>
          <AuditLogModal open={Boolean(form.logsTarget)} moduleName="Expense Category" entityId={form.logsTarget?.id ?? null} title={form.logsTarget ? `${form.logsTarget.categoryName} Logs` : "Expense Category Logs"} onClose={form.closeLogs} />
          <CommonDeleteModal open={Boolean(form.deleteTarget)} itemName={form.deleteTarget?.categoryName} softDelete loading={form.deleting} onCancel={form.cancelDelete} onConfirm={() => void form.confirmDelete()} />
        </>
      }
    />
  );
};

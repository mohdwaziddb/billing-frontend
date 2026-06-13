import { useEffect, useState } from "react";
import { Edit3, History, Plus, Trash2 } from "lucide-react";
import { createExpenseCategory, deleteExpenseCategory, getExpenseCategoriesPage, updateExpenseCategory } from "../api/expenseCategories";
import { ActionDropdown } from "../components/ActionDropdown";
import { AuditLogModal } from "../components/AuditLogModal";
import { Button } from "../components/Button";
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
import { useApiMessage } from "../hooks/useApiFeedback";
import { CommonErrorMessageUtil } from "../lib/CommonErrorMessageUtil";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import { formatDateTime } from "../lib/format";
import { notificationService } from "../services/notificationService";
import type { ExpenseCategory, PageResponse } from "../types/api";

const emptyPage: PageResponse<ExpenseCategory> = { records: [], page: 0, size: DEFAULT_PAGE_SIZE, totalRecords: 0, totalPages: 0 };

export const ExpenseCategoryPage = () => {
  const { can } = useAuth();
  const { setApiError } = useApiMessage();
  const [pageData, setPageData] = useState<PageResponse<ExpenseCategory>>(emptyPage);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("true");
  const [editing, setEditing] = useState<ExpenseCategory | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseCategory | null>(null);
  const [logTarget, setLogTarget] = useState<ExpenseCategory | null>(null);
  const [form, setForm] = useState({ categoryName: "", description: "", active: "true" });

  const load = async (page = 0) => {
    const response = await getExpenseCategoriesPage({ search: search || undefined, active: active ? active === "true" : undefined, page, size: DEFAULT_PAGE_SIZE });
    setPageData(response);
  };

  useEffect(() => {
    void load(0).catch((err: any) => setApiError(err, "Unable to load expense categories"));
  }, [search, active]);

  const openForm = (category?: ExpenseCategory) => {
    setEditing(category ?? null);
    setFormOpen(true);
    setForm({
      categoryName: category?.categoryName ?? "",
      description: category?.description ?? "",
      active: String(category?.active ?? true)
    });
  };

  const save = async () => {
    try {
      const payload = { categoryName: form.categoryName.trim(), description: form.description.trim() || undefined, active: form.active === "true" };
      if (editing) {
        await updateExpenseCategory(editing.id, payload);
        notificationService.showSuccess(CommonSuccessMessageUtil.updated("Expense Category"));
      } else {
        await createExpenseCategory(payload);
        notificationService.showSuccess(CommonSuccessMessageUtil.created("Expense Category"));
      }
      setEditing(null);
      setFormOpen(false);
      setForm({ categoryName: "", description: "", active: "true" });
      await load(pageData.page);
    } catch (err: any) {
      setApiError(err, "Unable to save expense category");
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await deleteExpenseCategory(deleteTarget.id);
      notificationService.showSuccess(CommonSuccessMessageUtil.deleted("Expense Category"));
      setDeleteTarget(null);
      await load(pageData.page);
    } catch (err: any) {
      setApiError(err, CommonErrorMessageUtil.deleteFailed);
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <Header title="Expense Categories" subtitle="Owner-managed category setup for profit, reporting, and analytics." />
      <GlassCard className="p-6 md:p-7">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
            <Input label="Search" value={search} onChange={(event) => setSearch(event.target.value)} />
            <Select label="Status" value={active} options={[{ label: "All", value: "" }, { label: "Active", value: "true" }, { label: "Inactive", value: "false" }]} onChange={(event) => setActive(event.target.value)} />
          </div>
          {can("EXPENSE_CATEGORIES", "ADD") ? (
            <Button type="button" onClick={() => openForm()}>
              <Plus size={16} />
              Add Category
            </Button>
          ) : null}
        </div>
        <Table
          data={pageData.records}
          columns={[
            { key: "name", header: "Category", render: (item) => <span className="font-semibold text-slate-950">{item.categoryName}</span> },
            { key: "description", header: "Description", render: (item) => item.description ?? "--" },
            { key: "status", header: "Status", render: (item) => <StatusBadge label={item.active ? "ACTIVE" : "INACTIVE"} /> },
            { key: "updated", header: "Updated At", render: (item) => formatDateTime(item.updatedAt) },
            {
              key: "actions",
              header: "Actions",
              className: "text-right",
              render: (item) => (
                <ActionDropdown actions={[
                  { label: "Edit", icon: <Edit3 size={15} />, hidden: !can("EXPENSE_CATEGORIES", "EDIT"), onClick: () => openForm(item) },
                  { label: "Show Logs", icon: <History size={15} />, hidden: !can("EXPENSE_CATEGORIES", "LOGS"), onClick: () => setLogTarget(item) },
                  { label: "Delete", icon: <Trash2 size={15} />, danger: true, hidden: !can("EXPENSE_CATEGORIES", "DELETE"), onClick: () => setDeleteTarget(item) }
                ]} />
              )
            }
          ]}
        />
        <Pagination page={pageData.page} size={pageData.size} totalRecords={pageData.totalRecords} totalPages={pageData.totalPages} onPageChange={(page) => void load(page)} />
      </GlassCard>

      <Modal open={formOpen} title={editing ? "Edit Expense Category" : "Add Expense Category"} onClose={() => { setFormOpen(false); setEditing(null); setForm({ categoryName: "", description: "", active: "true" }); }}>
        <div className="grid gap-4">
          <Input label="Category Name" requiredMark value={form.categoryName} onChange={(event) => setForm((current) => ({ ...current, categoryName: event.target.value }))} />
          <Input label="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          <Select label="Status" value={form.active} options={[{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }]} onChange={(event) => setForm((current) => ({ ...current, active: event.target.value }))} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setFormOpen(false); setEditing(null); setForm({ categoryName: "", description: "", active: "true" }); }}>Cancel</Button>
            <Button type="button" onClick={() => void save()}>Save</Button>
          </div>
        </div>
      </Modal>
      <AuditLogModal open={Boolean(logTarget)} moduleName="Expense Category" entityId={logTarget?.id ?? null} title={logTarget ? `${logTarget.categoryName} Logs` : "Expense Category Logs"} onClose={() => setLogTarget(null)} />
      <CommonDeleteModal open={Boolean(deleteTarget)} onCancel={() => setDeleteTarget(null)} onConfirm={() => void remove()} />
    </div>
  );
};

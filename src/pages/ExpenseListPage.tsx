import { useEffect, useMemo, useState } from "react";
import { Download, Edit3, History, Plus, Trash2 } from "lucide-react";
import { getCustomers } from "../api/customers";
import { getExpenseCategories } from "../api/expenseCategories";
import { createExpense, deleteExpense, getExpensesPage, updateExpense, type ExpenseFilterParams } from "../api/expenses";
import { getInvoices } from "../api/invoices";
import { ActionDropdown } from "../components/ActionDropdown";
import { AuditLogModal } from "../components/AuditLogModal";
import { Button } from "../components/Button";
import { CommonColumnSelector, applyVisibleColumns } from "../components/CommonColumnSelector";
import { CommonDeleteModal } from "../components/CommonDeleteModal";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { DEFAULT_PAGE_SIZE, Pagination } from "../components/Pagination";
import { Select } from "../components/Select";
import { StatCard } from "../components/StatCard";
import { Table } from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";
import { CommonErrorMessageUtil } from "../lib/CommonErrorMessageUtil";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import { formatCurrency } from "../lib/currency";
import { exportToExcel } from "../lib/excelExport";
import { formatDate } from "../lib/format";
import { notificationService } from "../services/notificationService";
import type { Customer, Expense, ExpenseCategory, ExpenseType, Invoice, PageResponse } from "../types/api";

const emptyPage: PageResponse<Expense> = { records: [], page: 0, size: DEFAULT_PAGE_SIZE, totalRecords: 0, totalPages: 0 };
const todayIso = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

export const ExpenseListPage = () => {
  const { can } = useAuth();
  const { setApiError } = useApiMessage();
  const [pageData, setPageData] = useState<PageResponse<Expense>>(emptyPage);
  const [exportRows, setExportRows] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filters, setFilters] = useState({ search: "", expenseType: "", categoryId: "", startDate: todayIso(), endDate: todayIso(), customerId: "", invoiceId: "", createdByRole: "" });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [logTarget, setLogTarget] = useState<Expense | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [form, setForm] = useState({ expenseType: "GENERAL" as ExpenseType, categoryId: "", customerId: "", invoiceId: "", amount: "", expenseDate: todayIso(), description: "", attachmentUrl: "" });

  const params = useMemo<ExpenseFilterParams>(() => ({
    search: filters.search || undefined,
    expenseType: filters.expenseType || undefined,
    categoryId: filters.categoryId || undefined,
    customerId: filters.customerId || undefined,
    invoiceId: filters.invoiceId || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    createdByRole: filters.createdByRole || undefined
  }), [filters]);

  const summary = useMemo(() => ({
    totalExpense: exportRows.reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
    general: exportRows.filter((item) => item.expenseType === "GENERAL").reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
    customer: exportRows.filter((item) => item.expenseType === "CUSTOMER_RELATED").reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
    invoice: exportRows.filter((item) => item.expenseType === "INVOICE_RELATED").reduce((sum, item) => sum + Number(item.amount ?? 0), 0)
  }), [exportRows]);

  const load = async (page = 0) => {
    const response = await getExpensesPage({ ...params, page, size: DEFAULT_PAGE_SIZE });
    setPageData(response);
  };

  const loadExport = async () => {
    const response = await getExpensesPage({ ...params, page: 0, size: 1000 });
    setExportRows(response.records);
  };

  useEffect(() => {
    void Promise.all([
      getExpenseCategories({ active: true, size: 1000 }).then(setCategories),
      getCustomers({ active: true, size: 1000 }).then(setCustomers),
      getInvoices({ size: 1000 }).then(setInvoices)
    ]).catch((err: any) => setApiError(err, "Unable to load expense setup"));
  }, []);

  useEffect(() => {
    void Promise.all([load(0), loadExport()]).catch((err: any) => setApiError(err, "Unable to load expenses"));
  }, [params]);

  const openForm = (expense?: Expense) => {
    setEditing(expense ?? null);
    setForm({
      expenseType: expense?.expenseType ?? "GENERAL",
      categoryId: expense ? String(expense.categoryId) : "",
      customerId: expense?.customerId ? String(expense.customerId) : "",
      invoiceId: expense?.invoiceId ? String(expense.invoiceId) : "",
      amount: expense ? String(expense.amount) : "",
      expenseDate: expense?.expenseDate ?? todayIso(),
      description: expense?.description ?? "",
      attachmentUrl: expense?.attachmentUrl ?? ""
    });
    setFormOpen(true);
  };

  const save = async () => {
    try {
      const selectedInvoice = invoices.find((invoice) => String(invoice.id) === form.invoiceId);
      const amount = Number(form.amount);
      if (!form.categoryId) {
        notificationService.showWarning("Please select an expense category.");
        return;
      }
      if (!form.amount || Number.isNaN(amount) || amount <= 0) {
        notificationService.showWarning("Please enter a valid expense amount.");
        return;
      }
      if (!form.expenseDate) {
        notificationService.showWarning("Please select an expense date.");
        return;
      }
      if (form.expenseType === "CUSTOMER_RELATED" && !form.customerId) {
        notificationService.showWarning("Please select a customer for this expense.");
        return;
      }
      if (form.expenseType === "INVOICE_RELATED" && (!form.invoiceId || !selectedInvoice)) {
        notificationService.showWarning("Please select an invoice for this expense.");
        return;
      }
      const payload = {
        expenseType: form.expenseType,
        categoryId: Number(form.categoryId),
        customerId: form.expenseType === "CUSTOMER_RELATED" ? Number(form.customerId) : form.expenseType === "INVOICE_RELATED" ? selectedInvoice?.customerId : undefined,
        invoiceId: form.expenseType === "INVOICE_RELATED" ? Number(form.invoiceId) : undefined,
        amount,
        expenseDate: form.expenseDate,
        description: form.description.trim() || undefined,
        attachmentUrl: form.attachmentUrl.trim() || undefined
      };
      if (editing) {
        await updateExpense(editing.id, payload);
        notificationService.showSuccess(CommonSuccessMessageUtil.updated("Expense"));
      } else {
        await createExpense(payload);
        notificationService.showSuccess(CommonSuccessMessageUtil.created("Expense"));
      }
      setFormOpen(false);
      setEditing(null);
      await Promise.all([load(pageData.page), loadExport()]);
    } catch (err: any) {
      setApiError(err, "Unable to save expense");
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await deleteExpense(deleteTarget.id);
      notificationService.showSuccess(CommonSuccessMessageUtil.deleted("Expense"));
      setDeleteTarget(null);
      await Promise.all([load(pageData.page), loadExport()]);
    } catch (err: any) {
      setApiError(err, CommonErrorMessageUtil.deleteFailed);
    }
  };

  const selectedInvoice = invoices.find((invoice) => String(invoice.id) === form.invoiceId);
  const expenseColumns = useMemo(() => [
    { key: "type", header: "Expense Type", render: (item: Expense) => typeLabel(item.expenseType) },
    { key: "category", header: "Category", render: (item: Expense) => item.categoryName },
    { key: "customer", header: "Customer", render: (item: Expense) => item.customerName ?? "--" },
    { key: "invoice", header: "Invoice", render: (item: Expense) => item.invoiceNo ?? "--" },
    { key: "amount", header: "Amount", className: "text-right", render: (item: Expense) => <span className="block text-right font-semibold text-slate-950">{formatCurrency(item.amount)}</span> },
    { key: "date", header: "Date", render: (item: Expense) => formatDate(item.expenseDate) },
    { key: "description", header: "Description", render: (item: Expense) => item.description ?? "--" },
    { key: "createdBy", header: "Created By", render: (item: Expense) => item.createdBy ?? "--" }
  ], []);
  const expenseActionColumn = useMemo(() => ({
    key: "actions",
    header: "Actions",
    className: "text-right",
    render: (item: Expense) => <ActionDropdown actions={[
      { label: "Edit", icon: <Edit3 size={15} />, hidden: !can("EXPENSES", "EDIT"), onClick: () => openForm(item) },
      { label: "Show Logs", icon: <History size={15} />, hidden: !can("EXPENSES", "LOGS"), onClick: () => setLogTarget(item) },
      { label: "Delete", icon: <Trash2 size={15} />, danger: true, hidden: !can("EXPENSES", "DELETE"), onClick: () => setDeleteTarget(item) }
    ]} />
  }), [can, invoices]);
  const visibleExpenseColumns = useMemo(() => applyVisibleColumns(expenseColumns, visibleColumns), [expenseColumns, visibleColumns]);
  const visibleExpenseExportColumns = useMemo(() => applyVisibleColumns(expenseExportColumns, visibleColumns), [visibleColumns]);

  return (
    <div className="space-y-4 pb-6">
      <Header title="Expenses" subtitle="Track general, customer-related, and invoice-related spend for profitability reporting." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Expense" value={formatCurrency(summary.totalExpense)} caption="Filtered expense amount" />
        <StatCard label="General" value={formatCurrency(summary.general)} caption="Business overhead" />
        <StatCard label="Customer Related" value={formatCurrency(summary.customer)} caption="Customer service spend" />
        <StatCard label="Invoice Related" value={formatCurrency(summary.invoice)} caption="Invoice fulfillment spend" />
      </div>

      <GlassCard className="p-6 md:p-7">
        <div className="mb-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Input label="Search" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
            <Select label="Expense Type" value={filters.expenseType} options={[{ label: "All", value: "" }, ...expenseTypeOptions]} onChange={(event) => setFilters((current) => ({ ...current, expenseType: event.target.value }))} />
            <Select label="Category" value={filters.categoryId} options={[{ label: "All", value: "" }, ...categories.map((item) => ({ label: item.categoryName, value: String(item.id) }))]} onChange={(event) => setFilters((current) => ({ ...current, categoryId: event.target.value }))} />
            <Input label="Start Date" type="date" value={filters.startDate} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))} />
            <Input label="End Date" type="date" value={filters.endDate} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))} />
            <Select label="Customer" value={filters.customerId} options={[{ label: "All", value: "" }, ...customers.map((item) => ({ label: item.name, value: String(item.id) }))]} onChange={(event) => setFilters((current) => ({ ...current, customerId: event.target.value }))} />
            <Select label="Invoice" value={filters.invoiceId} options={[{ label: "All", value: "" }, ...invoices.map((item) => ({ label: item.invoiceNo, value: String(item.id) }))]} onChange={(event) => setFilters((current) => ({ ...current, invoiceId: event.target.value }))} />
            <Select label="Created By" value={filters.createdByRole} options={[{ label: "All", value: "" }, { label: "Owner", value: "OWNER" }, { label: "Admin", value: "ADMIN" }, { label: "User", value: "USER" }]} onChange={(event) => setFilters((current) => ({ ...current, createdByRole: event.target.value }))} />
          </div>
          <div className="flex items-end gap-2">
            <CommonColumnSelector tableName="EXPENSES" availableColumns={expenseColumns.map(({ key, header }) => ({ key, header }))} visibleColumns={visibleColumns} onApply={setVisibleColumns} />
            {can("EXPENSES", "EXPORT") ? <Button type="button" variant="secondary" disabled={!exportRows.length} onClick={() => exportToExcel("expenses.xlsx", exportRows, visibleExpenseExportColumns)}><Download size={16} />Export</Button> : null}
            {can("EXPENSES", "ADD") ? <Button type="button" onClick={() => openForm()}><Plus size={16} />Add Expense</Button> : null}
          </div>
        </div>
        <Table
          data={pageData.records}
          columns={[...visibleExpenseColumns, expenseActionColumn]}
        />
        <Pagination page={pageData.page} size={pageData.size} totalRecords={pageData.totalRecords} totalPages={pageData.totalPages} onPageChange={(page) => void load(page)} />
      </GlassCard>

      <Modal open={formOpen} title={editing ? "Edit Expense" : "Add Expense"} onClose={() => setFormOpen(false)}>
        <div className="grid gap-4 md:grid-cols-2">
          <Select label="Expense Type" requiredMark value={form.expenseType} options={expenseTypeOptions} onChange={(event) => setForm((current) => ({ ...current, expenseType: event.target.value as ExpenseType, customerId: "", invoiceId: "" }))} />
          <Select label="Category" requiredMark value={form.categoryId} options={categories.map((item) => ({ label: item.categoryName, value: String(item.id) }))} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))} />
          {form.expenseType === "CUSTOMER_RELATED" ? <Select label="Customer" requiredMark value={form.customerId} options={customers.map((item) => ({ label: item.name, value: String(item.id) }))} onChange={(event) => setForm((current) => ({ ...current, customerId: event.target.value }))} /> : null}
          {form.expenseType === "INVOICE_RELATED" ? (
            <>
              <Select label="Invoice" requiredMark value={form.invoiceId} options={invoices.map((item) => ({ label: `${item.invoiceNo} - ${item.customerName}`, value: String(item.id) }))} onChange={(event) => setForm((current) => ({ ...current, invoiceId: event.target.value }))} />
              <Input label="Customer" value={selectedInvoice?.customerName ?? ""} readOnly className="bg-slate-100 text-slate-600" />
            </>
          ) : null}
          <Input label="Amount" requiredMark type="number" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} />
          <Input label="Expense Date" requiredMark type="date" value={form.expenseDate} onChange={(event) => setForm((current) => ({ ...current, expenseDate: event.target.value }))} />
          <Input label="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          <Input label="Attachment URL" value={form.attachmentUrl} onChange={(event) => setForm((current) => ({ ...current, attachmentUrl: event.target.value }))} />
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="button" onClick={() => void save()}>Save Expense</Button>
          </div>
        </div>
      </Modal>
      <AuditLogModal open={Boolean(logTarget)} moduleName="Expense" entityId={logTarget?.id ?? null} title={logTarget ? `${typeLabel(logTarget.expenseType)} Expense Logs` : "Expense Logs"} onClose={() => setLogTarget(null)} />
      <CommonDeleteModal open={Boolean(deleteTarget)} onCancel={() => setDeleteTarget(null)} onConfirm={() => void remove()} />
    </div>
  );
};

const expenseTypeOptions = [
  { label: "General", value: "GENERAL" },
  { label: "Customer Related", value: "CUSTOMER_RELATED" },
  { label: "Invoice Related", value: "INVOICE_RELATED" }
];

const typeLabel = (value: ExpenseType) => value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

const expenseExportColumns = [
  { key: "type", header: "Expense Type", value: (row: Expense) => typeLabel(row.expenseType) },
  { key: "category", header: "Category", value: (row: Expense) => row.categoryName },
  { key: "customer", header: "Customer", value: (row: Expense) => row.customerName },
  { key: "invoice", header: "Invoice", value: (row: Expense) => row.invoiceNo },
  { key: "amount", header: "Amount", type: "amount" as const },
  { key: "date", header: "Date", value: (row: Expense) => row.expenseDate, type: "date" as const },
  { key: "description", header: "Description" },
  { key: "createdBy", header: "Created By" }
];

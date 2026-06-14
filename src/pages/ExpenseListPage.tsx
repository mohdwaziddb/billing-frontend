import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Download, Edit3, History, Layers3, Plus, ReceiptIndianRupee } from "lucide-react";
import { getCustomers } from "../api/customers";
import { getExpenseCategories } from "../api/expenseCategories";
import { createExpense, deleteExpense, getExpensesPage, updateExpense, type ExpenseFilterParams } from "../api/expenses";
import { getInvoices } from "../api/invoices";
import { ActionDropdown } from "../components/ActionDropdown";
import { AuditLogModal } from "../components/AuditLogModal";
import { Button } from "../components/Button";
import { CommonAdvancedFilterPanel } from "../components/CommonAdvancedFilterPanel";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { CommonColumnSelector, applyVisibleColumns } from "../components/CommonColumnSelector";
import { CommonDashboardDetailModal, type DashboardDetailModalColumn } from "../components/CommonDashboardDetailModal";
import { CommonDeleteIcon } from "../components/CommonDeleteAction";
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
const monthStartIso = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
};

type DatePreset = "" | "today" | "yesterday" | "thisWeek" | "thisMonth" | "thisYear" | "custom";

type ExpenseFilters = {
  search: string;
  expenseType: string;
  categoryId: string;
  datePreset: DatePreset;
  startDate: string;
  endDate: string;
  customerId: string;
  invoiceId: string;
  createdByRole: string;
};

const emptyExpenseFilters: ExpenseFilters = { search: "", expenseType: "", categoryId: "", datePreset: "", startDate: "", endDate: "", customerId: "", invoiceId: "", createdByRole: "" };
type ExpenseDrilldownKey = "total" | "thisMonth" | "today" | "category";

const toIso = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;

const dateRangeForPreset = (preset: DatePreset) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (preset === "today") return { startDate: toIso(today), endDate: toIso(today) };
  if (preset === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return { startDate: toIso(yesterday), endDate: toIso(yesterday) };
  }
  if (preset === "thisWeek") {
    const start = new Date(today);
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    return { startDate: toIso(start), endDate: toIso(today) };
  }
  if (preset === "thisMonth") return { startDate: toIso(new Date(today.getFullYear(), today.getMonth(), 1)), endDate: toIso(today) };
  if (preset === "thisYear") return { startDate: toIso(new Date(today.getFullYear(), 0, 1)), endDate: toIso(today) };
  return { startDate: "", endDate: "" };
};

export const ExpenseListPage = () => {
  const { can } = useAuth();
  const { setApiError } = useApiMessage();
  const [pageData, setPageData] = useState<PageResponse<Expense>>(emptyPage);
  const [exportRows, setExportRows] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [dashboardRows, setDashboardRows] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [draftFilters, setDraftFilters] = useState(emptyExpenseFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyExpenseFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [logTarget, setLogTarget] = useState<Expense | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [activeDrilldown, setActiveDrilldown] = useState<ExpenseDrilldownKey | null>(null);
  const [drilldownPage, setDrilldownPage] = useState<PageResponse<Expense>>(emptyPage);
  const [drilldownPageNumber, setDrilldownPageNumber] = useState(0);
  const [drilldownSearch, setDrilldownSearch] = useState("");
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [form, setForm] = useState({ expenseType: "GENERAL" as ExpenseType, categoryId: "", customerId: "", invoiceId: "", amount: "", expenseDate: todayIso(), description: "", attachmentUrl: "" });

  const params = useMemo<ExpenseFilterParams>(() => {
    const dateRange = appliedFilters.datePreset === "custom"
      ? { startDate: appliedFilters.startDate, endDate: appliedFilters.endDate }
      : dateRangeForPreset(appliedFilters.datePreset);
    return {
      search: appliedFilters.search || undefined,
      expenseType: appliedFilters.expenseType || undefined,
      categoryId: appliedFilters.categoryId || undefined,
      customerId: appliedFilters.customerId || undefined,
      invoiceId: appliedFilters.invoiceId || undefined,
      startDate: dateRange.startDate || undefined,
      endDate: dateRange.endDate || undefined,
      createdByRole: appliedFilters.createdByRole || undefined
    };
  }, [appliedFilters]);

  const activeFilterSummary = useMemo(() => summarizeExpenseFilters(appliedFilters, categories, customers, invoices), [appliedFilters, categories, customers, invoices]);
  const selectedCategory = categories.find((category) => String(category.id) === appliedFilters.categoryId) ?? null;
  const dashboardSummary = useMemo(() => {
    const today = todayIso();
    const monthStart = monthStartIso();
    const todayRows = dashboardRows.filter((item) => item.expenseDate === today);
    const monthRows = dashboardRows.filter((item) => item.expenseDate >= monthStart && item.expenseDate <= today);
    const categoryRows = selectedCategory ? dashboardRows.filter((item) => item.categoryId === selectedCategory.id) : dashboardRows;
    return {
      total: sumExpenses(dashboardRows),
      today: sumExpenses(todayRows),
      thisMonth: sumExpenses(monthRows),
      category: sumExpenses(categoryRows),
      categoryCount: categoryRows.length
    };
  }, [dashboardRows, selectedCategory]);

  const load = async (page = 0) => {
    const response = await getExpensesPage({ ...params, page, size: DEFAULT_PAGE_SIZE });
    setPageData(response);
  };

  const loadExport = async () => {
    const response = await getExpensesPage({ ...params, page: 0, size: 1000 });
    setExportRows(response.records);
  };

  const loadDashboardRows = async () => {
    const response = await getExpensesPage({ page: 0, size: 1000 });
    setDashboardRows(response.records);
  };

  useEffect(() => {
    void Promise.all([
      getExpenseCategories({ active: true, size: 1000 }).then(setCategories),
      getCustomers({ active: true, size: 1000 }).then(setCustomers),
      getInvoices({ size: 1000 }).then(setInvoices),
      loadDashboardRows()
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

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setFiltersOpen(false);
  };

  const resetFilters = () => {
    setDraftFilters(emptyExpenseFilters);
    setAppliedFilters(emptyExpenseFilters);
    setFiltersOpen(false);
  };

  const openCategoryCard = () => {
    openDrilldown("category");
  };

  const openDrilldown = (key: ExpenseDrilldownKey) => {
    setActiveDrilldown(key);
    setDrilldownPageNumber(0);
    setDrilldownSearch("");
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
      await Promise.all([load(pageData.page), loadExport(), loadDashboardRows()]);
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
      await Promise.all([load(pageData.page), loadExport(), loadDashboardRows()]);
    } catch (err: any) {
      setApiError(err, CommonErrorMessageUtil.deleteFailed);
    }
  };

  const selectedInvoice = invoices.find((invoice) => String(invoice.id) === form.invoiceId);
  const expenseAmount = Number(form.amount);
  const canSaveExpense = Boolean(
    form.categoryId &&
    form.amount &&
    Number.isFinite(expenseAmount) &&
    expenseAmount > 0 &&
    form.expenseDate &&
    (form.expenseType !== "CUSTOMER_RELATED" || form.customerId) &&
    (form.expenseType !== "INVOICE_RELATED" || (form.invoiceId && selectedInvoice))
  );
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
      { label: "Delete", icon: <CommonDeleteIcon />, danger: true, hidden: !can("EXPENSES", "DELETE"), onClick: () => setDeleteTarget(item) }
    ]} />
  }), [can, invoices]);
  const visibleExpenseColumns = useMemo(() => applyVisibleColumns(expenseColumns, visibleColumns), [expenseColumns, visibleColumns]);
  const visibleExpenseExportColumns = useMemo(() => applyVisibleColumns(expenseExportColumns, visibleColumns), [visibleColumns]);
  const expenseDrilldownColumns = useMemo<DashboardDetailModalColumn<Expense>[]>(() => [
    { key: "expenseType", header: "Expense Type", value: (row) => typeLabel(row.expenseType) },
    { key: "categoryName", header: "Category" },
    { key: "customerName", header: "Customer" },
    { key: "invoiceNo", header: "Invoice" },
    { key: "amount", header: "Amount", type: "currency", className: "text-right" },
    { key: "expenseDate", header: "Date", type: "date" },
    { key: "description", header: "Description" },
    { key: "createdBy", header: "Created By" }
  ], []);
  const activeDrilldownParams = useMemo<ExpenseFilterParams>(() => {
    if (!activeDrilldown) {
      return {};
    }
    const base: ExpenseFilterParams = { search: drilldownSearch || undefined };
    if (activeDrilldown === "today") {
      return { ...base, startDate: todayIso(), endDate: todayIso() };
    }
    if (activeDrilldown === "thisMonth") {
      return { ...base, startDate: monthStartIso(), endDate: todayIso() };
    }
    if (activeDrilldown === "category") {
      return selectedCategory ? { ...base, categoryId: selectedCategory.id } : base;
    }
    return base;
  }, [activeDrilldown, drilldownSearch, selectedCategory]);
  const activeDrilldownTitle = activeDrilldown === "today"
    ? "Today's Expense Details"
    : activeDrilldown === "thisMonth"
      ? "This Month Expense Details"
      : activeDrilldown === "category"
        ? `${selectedCategory?.categoryName ?? "Category Wise"} Expense Details`
        : "Total Expense Details";
  const activeDrilldownFilters = activeDrilldown === "today"
    ? [`Date: ${formatDate(todayIso())}`]
    : activeDrilldown === "thisMonth"
      ? [`Date: ${formatDate(monthStartIso())} - ${formatDate(todayIso())}`]
      : activeDrilldown === "category" && selectedCategory
        ? [`Category: ${selectedCategory.categoryName}`]
        : activeDrilldown === "category"
          ? ["All categories"]
        : ["All expenses"];
  const activeDrilldownGrandTotal = useMemo(
    () => formatCurrency(drilldownPage.records.reduce((sum, item) => sum + Number(item.amount ?? 0), 0)),
    [drilldownPage.records]
  );

  useEffect(() => {
    if (!activeDrilldown) {
      return;
    }
    setDrilldownLoading(true);
    void getExpensesPage({ ...activeDrilldownParams, page: drilldownPageNumber, size: DEFAULT_PAGE_SIZE })
      .then(setDrilldownPage)
      .catch((err: any) => setApiError(err, "Unable to load expense details"))
      .finally(() => setDrilldownLoading(false));
  }, [activeDrilldown, activeDrilldownParams, drilldownPageNumber, setApiError]);

  return (
    <div className="space-y-4 pb-6">
      <Header title="Expenses" subtitle="Track general, customer-related, and invoice-related spend for profitability reporting." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Expenses" value={formatCurrency(dashboardSummary.total)} caption="All expenses" icon={<ReceiptIndianRupee size={18} />} onClick={() => openDrilldown("total")} />
        <StatCard label="This Month Expenses" value={formatCurrency(dashboardSummary.thisMonth)} caption="Current month expenses" icon={<CalendarDays size={18} />} onClick={() => openDrilldown("thisMonth")} />
        <StatCard label="Today's Expenses" value={formatCurrency(dashboardSummary.today)} caption="Only today's expenses" icon={<CalendarDays size={18} />} onClick={() => openDrilldown("today")} />
        <StatCard label="Category Wise Expenses" value={formatCurrency(dashboardSummary.category)} caption={selectedCategory ? `${selectedCategory.categoryName} | ${dashboardSummary.categoryCount} records` : `All categories | ${dashboardSummary.categoryCount} records`} icon={<Layers3 size={18} />} onClick={openCategoryCard} />
      </div>

      <CommonAdvancedFilterPanel
        title="Advanced Expense Search"
        eyebrow="Expense Filters"
        expanded={filtersOpen}
        activeFilters={activeFilterSummary}
        onToggle={() => setFiltersOpen((current) => !current)}
        onClearAll={resetFilters}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input label="Search" value={draftFilters.search} onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))} onClear={() => setDraftFilters((current) => ({ ...current, search: "" }))} />
          <Select label="Expense Type" value={draftFilters.expenseType} options={[{ label: "All", value: "" }, ...expenseTypeOptions]} onChange={(event) => setDraftFilters((current) => ({ ...current, expenseType: event.target.value }))} />
          <Select label="Category" value={draftFilters.categoryId} options={[{ label: "All", value: "" }, ...categories.map((item) => ({ label: item.categoryName, value: String(item.id) }))]} onChange={(event) => setDraftFilters((current) => ({ ...current, categoryId: event.target.value }))} />
          <Select label="Expense Date" value={draftFilters.datePreset} options={[
            { label: "All", value: "" },
            { label: "Today", value: "today" },
            { label: "Yesterday", value: "yesterday" },
            { label: "This Week", value: "thisWeek" },
            { label: "This Month", value: "thisMonth" },
            { label: "This Year", value: "thisYear" },
            { label: "Custom Date Range", value: "custom" }
          ]} onChange={(event) => setDraftFilters((current) => ({ ...current, datePreset: event.target.value as DatePreset, startDate: event.target.value === "custom" ? current.startDate : "", endDate: event.target.value === "custom" ? current.endDate : "" }))} />
          {draftFilters.datePreset === "custom" ? (
            <>
              <Input label="Start Date" type="date" value={draftFilters.startDate} onChange={(event) => setDraftFilters((current) => ({ ...current, startDate: event.target.value }))} />
              <Input label="End Date" type="date" value={draftFilters.endDate} onChange={(event) => setDraftFilters((current) => ({ ...current, endDate: event.target.value }))} />
            </>
          ) : null}
          <Select label="Customer" value={draftFilters.customerId} options={[{ label: "All", value: "" }, ...customers.map((item) => ({ label: item.name, value: String(item.id) }))]} onChange={(event) => setDraftFilters((current) => ({ ...current, customerId: event.target.value }))} />
          <Select label="Invoice" value={draftFilters.invoiceId} options={[{ label: "All", value: "" }, ...invoices.map((item) => ({ label: item.invoiceNo, value: String(item.id) }))]} onChange={(event) => setDraftFilters((current) => ({ ...current, invoiceId: event.target.value }))} />
          <Select label="Created By" value={draftFilters.createdByRole} options={[{ label: "All", value: "" }, { label: "Owner", value: "OWNER" }, { label: "Admin", value: "ADMIN" }, { label: "User", value: "USER" }]} onChange={(event) => setDraftFilters((current) => ({ ...current, createdByRole: event.target.value }))} />
          <div className="flex items-end">
            <Button type="button" className="w-full" onClick={applyFilters}>Apply Filters</Button>
          </div>
          <div className="flex items-end">
            <Button type="button" variant="secondary" className="w-full" onClick={resetFilters}>Reset Filters</Button>
          </div>
        </div>
      </CommonAdvancedFilterPanel>

      <GlassCard className="p-6 md:p-7">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CommonBreadcrumb items={[{ label: "Expenses" }]} />
          <div className="flex flex-wrap gap-2">
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
            <Button type="button" disabled={!canSaveExpense} onClick={() => void save()}>Save Expense</Button>
          </div>
        </div>
      </Modal>
      <AuditLogModal open={Boolean(logTarget)} moduleName="Expense" entityId={logTarget?.id ?? null} title={logTarget ? `${typeLabel(logTarget.expenseType)} Expense Logs` : "Expense Logs"} onClose={() => setLogTarget(null)} />
      <CommonDeleteModal open={Boolean(deleteTarget)} onCancel={() => setDeleteTarget(null)} onConfirm={() => void remove()} />
      <CommonDashboardDetailModal
        open={Boolean(activeDrilldown)}
        title={activeDrilldownTitle}
        rows={drilldownPage.records}
        columns={expenseDrilldownColumns}
        loading={drilldownLoading}
        search={drilldownSearch}
        page={drilldownPage.page}
        totalRecords={drilldownPage.totalRecords}
        totalPages={drilldownPage.totalPages}
        activeFilters={activeDrilldownFilters}
        grandTotal={activeDrilldownGrandTotal}
        emptyText="No expenses found for this card."
        onClose={() => setActiveDrilldown(null)}
        onSearchChange={(value) => {
          setDrilldownPageNumber(0);
          setDrilldownSearch(value);
        }}
        onPageChange={setDrilldownPageNumber}
        onExport={() => exportToExcel(`${activeDrilldown ?? "expenses"}-details.xlsx`, drilldownPage.records, expenseExportColumns)}
      />
    </div>
  );
};

const expenseTypeOptions = [
  { label: "General", value: "GENERAL" },
  { label: "Customer Related", value: "CUSTOMER_RELATED" },
  { label: "Invoice Related", value: "INVOICE_RELATED" }
];

const typeLabel = (value: ExpenseType) => value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

const sumExpenses = (rows: Expense[]) => rows.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

const summarizeExpenseFilters = (
  filters: ExpenseFilters,
  categories: ExpenseCategory[],
  customers: Customer[],
  invoices: Invoice[]
) => {
  const summary: string[] = [];
  const datePresetLabels: Record<DatePreset, string> = {
    "": "",
    today: "Today",
    yesterday: "Yesterday",
    thisWeek: "This Week",
    thisMonth: "This Month",
    thisYear: "This Year",
    custom: "Custom Date"
  };
  if (filters.search.trim()) summary.push(`Search: ${filters.search.trim()}`);
  if (filters.expenseType) summary.push(typeLabel(filters.expenseType as ExpenseType));
  if (filters.categoryId) summary.push(`Category: ${categories.find((item) => String(item.id) === filters.categoryId)?.categoryName ?? filters.categoryId}`);
  if (filters.datePreset === "custom" && (filters.startDate || filters.endDate)) {
    summary.push(`${formatDate(filters.startDate) || "Start"} - ${formatDate(filters.endDate) || "End"}`);
  } else if (filters.datePreset) {
    summary.push(datePresetLabels[filters.datePreset]);
  }
  if (filters.customerId) summary.push(`Customer: ${customers.find((item) => String(item.id) === filters.customerId)?.name ?? filters.customerId}`);
  if (filters.invoiceId) summary.push(`Invoice: ${invoices.find((item) => String(item.id) === filters.invoiceId)?.invoiceNo ?? filters.invoiceId}`);
  if (filters.createdByRole) summary.push(`Created By: ${filters.createdByRole}`);
  return summary;
};

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

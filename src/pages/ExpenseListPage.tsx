import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Download, Edit3, History, Layers3, Plus, ReceiptIndianRupee } from "lucide-react";
import { getCustomers } from "../api/customers";
import { getExpenseCategories } from "../api/expenseCategories";
import { createExpense, deleteExpense, getExpensesPage, updateExpense, type ExpenseFilterParams } from "../api/expenses";
import { getInvoices } from "../api/invoices";
import { ActionDropdown } from "../components/ActionDropdown";
import { AuditLogModal } from "../components/AuditLogModal";
import { Button } from "../components/Button";
import { applyVisibleColumns } from "../components/CommonColumnSelector";
import { CommonDashboardDetailModal, type DashboardDetailModalColumn } from "../components/CommonDashboardDetailModal";
import { CommonDeleteIcon } from "../components/CommonDeleteAction";
import { CommonDeleteModal } from "../components/CommonDeleteModal";
import { CommonListPage } from "../components/CommonListPage";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { DEFAULT_PAGE_SIZE } from "../components/Pagination";
import { Select } from "../components/Select";
import { StatCard } from "../components/StatCard";
import { useAuth } from "../context/AuthContext";
import { useAddEditForm } from "../hooks/useAddEditForm";
import { useApiMessage } from "../hooks/useApiFeedback";
import { useListPage } from "../hooks/useListPage";
import { CommonErrorMessageUtil } from "../lib/CommonErrorMessageUtil";
import { formatCurrency } from "../lib/currency";
import { exportToExcel } from "../lib/excelExport";
import { formatDate } from "../lib/format";
import { notificationService } from "../services/notificationService";
import type { Customer, Expense, ExpenseCategory, ExpenseRequest, ExpenseType, Invoice } from "../types/api";

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

type ExpenseFormState = {
  expenseType: ExpenseType;
  categoryId: string;
  customerId: string;
  invoiceId: string;
  amount: string;
  expenseDate: string;
  description: string;
  attachmentUrl: string;
};

const getEmptyForm = (): ExpenseFormState => ({
  expenseType: "GENERAL",
  categoryId: "",
  customerId: "",
  invoiceId: "",
  amount: "",
  expenseDate: todayIso(),
  description: "",
  attachmentUrl: ""
});

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

const paramsFor = (filters: ExpenseFilters): ExpenseFilterParams => {
  const dateRange = filters.datePreset === "custom"
    ? { startDate: filters.startDate, endDate: filters.endDate }
    : dateRangeForPreset(filters.datePreset);
  return {
    search: filters.search || undefined,
    expenseType: filters.expenseType || undefined,
    categoryId: filters.categoryId || undefined,
    customerId: filters.customerId || undefined,
    invoiceId: filters.invoiceId || undefined,
    startDate: dateRange.startDate || undefined,
    endDate: dateRange.endDate || undefined,
    createdByRole: filters.createdByRole || undefined
  };
};

const getFormWarning = (values: ExpenseFormState, invoices: Invoice[]): string | null => {
  const amount = Number(values.amount);
  if (!values.categoryId) {
    return "Please select an expense category.";
  }
  if (!values.amount || Number.isNaN(amount) || amount <= 0) {
    return "Please enter a valid expense amount.";
  }
  if (!values.expenseDate) {
    return "Please select an expense date.";
  }
  if (values.expenseType === "CUSTOMER_RELATED" && !values.customerId) {
    return "Please select a customer for this expense.";
  }
  if (values.expenseType === "INVOICE_RELATED") {
    const selectedInvoice = invoices.find((invoice) => String(invoice.id) === values.invoiceId);
    if (!values.invoiceId || !selectedInvoice) {
      return "Please select an invoice for this expense.";
    }
  }
  return null;
};

export const ExpenseListPage = () => {
  const { can } = useAuth();
  const { setApiError } = useApiMessage();
  const [exportRows, setExportRows] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [dashboardRows, setDashboardRows] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [activeDrilldown, setActiveDrilldown] = useState<ExpenseDrilldownKey | null>(null);
  const [drilldownPage, setDrilldownPage] = useState<{ records: Expense[]; page: number; size: number; totalRecords: number; totalPages: number }>({ records: [], page: 0, size: DEFAULT_PAGE_SIZE, totalRecords: 0, totalPages: 0 });
  const [drilldownPageNumber, setDrilldownPageNumber] = useState(0);
  const [drilldownSearch, setDrilldownSearch] = useState("");
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  const list = useListPage<Expense, ExpenseFilters>({
    initialFilters: emptyExpenseFilters,
    errorMessage: "Unable to load expenses",
    fetchPage: ({ page, size, filters }) => getExpensesPage({ ...paramsFor(filters), page, size })
  });

  const loadExportRows = async (filters: ExpenseFilters) => {
    const response = await getExpensesPage({ ...paramsFor(filters), page: 0, size: 1000 });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadExportRows(list.activeFilters).catch((err: any) => setApiError(err, "Unable to load expenses"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.activeFilters]);

  const form = useAddEditForm<Expense, ExpenseFormState, ExpenseRequest>({
    emptyForm: getEmptyForm(),
    entityName: "Expense",
    errorMessage: "Unable to save expense",
    toFormValues: (expense) => ({
      expenseType: expense.expenseType,
      categoryId: String(expense.categoryId),
      customerId: expense.customerId ? String(expense.customerId) : "",
      invoiceId: expense.invoiceId ? String(expense.invoiceId) : "",
      amount: String(expense.amount),
      expenseDate: expense.expenseDate,
      description: expense.description ?? "",
      attachmentUrl: expense.attachmentUrl ?? ""
    }),
    buildRequest: (values) => {
      const selectedInvoice = invoices.find((invoice) => String(invoice.id) === values.invoiceId);
      return {
        expenseType: values.expenseType,
        categoryId: Number(values.categoryId),
        customerId: values.expenseType === "CUSTOMER_RELATED" ? Number(values.customerId) : values.expenseType === "INVOICE_RELATED" ? selectedInvoice?.customerId : undefined,
        invoiceId: values.expenseType === "INVOICE_RELATED" ? Number(values.invoiceId) : undefined,
        amount: Number(values.amount),
        expenseDate: values.expenseDate,
        description: values.description.trim() || undefined,
        attachmentUrl: values.attachmentUrl.trim() || undefined
      };
    },
    create: createExpense,
    update: updateExpense,
    remove: deleteExpense,
    onSaved: () => {
      list.refreshTable();
      void loadExportRows(list.activeFilters);
      void loadDashboardRows();
    }
  });

  const activeFilterSummary = useMemo(() => summarizeExpenseFilters(list.activeFilters, categories, customers, invoices), [list.activeFilters, categories, customers, invoices]);
  const selectedCategory = categories.find((category) => String(category.id) === list.activeFilters.categoryId) ?? null;
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

  const openCategoryCard = () => {
    openDrilldown("category");
  };

  const openDrilldown = (key: ExpenseDrilldownKey) => {
    setActiveDrilldown(key);
    setDrilldownPageNumber(0);
    setDrilldownSearch("");
  };

  const selectedInvoice = invoices.find((invoice) => String(invoice.id) === form.formValues.invoiceId);
  const expenseAmount = Number(form.formValues.amount);
  const canSaveExpense = Boolean(
    form.formValues.categoryId &&
    form.formValues.amount &&
    Number.isFinite(expenseAmount) &&
    expenseAmount > 0 &&
    form.formValues.expenseDate &&
    (form.formValues.expenseType !== "CUSTOMER_RELATED" || form.formValues.customerId) &&
    (form.formValues.expenseType !== "INVOICE_RELATED" || (form.formValues.invoiceId && selectedInvoice))
  );

  const submitForm = () => {
    const warning = getFormWarning(form.formValues, invoices);
    if (warning) {
      notificationService.showWarning(warning);
      return;
    }
    void form.saveForm();
  };

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
      { label: "Edit", icon: <Edit3 size={15} />, hidden: !can("EXPENSES", "EDIT"), onClick: () => form.openEditForm(item) },
      { label: "Show Logs", icon: <History size={15} />, hidden: !can("EXPENSES", "LOGS"), onClick: () => form.openLogs(item) },
      { label: "Delete", icon: <CommonDeleteIcon />, danger: true, hidden: !can("EXPENSES", "DELETE"), onClick: () => form.askDelete(item) }
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
    <CommonListPage<Expense, ExpenseFilters>
      pageTitle="Expenses"
      pageSubtitle="Track general, customer-related, and invoice-related spend for profitability reporting."
      list={list}
      searchPlaceholder="Search Expense"
      activeFilterCount={() => activeFilterSummary.length}
      filterPanelWidth="max-w-[720px]"
      filtersClassName="grid gap-3 md:grid-cols-2"
      statCards={
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Expenses" value={formatCurrency(dashboardSummary.total)} caption="All expenses" icon={<ReceiptIndianRupee size={18} />} onClick={() => openDrilldown("total")} />
          <StatCard label="This Month Expenses" value={formatCurrency(dashboardSummary.thisMonth)} caption="Current month expenses" icon={<CalendarDays size={18} />} onClick={() => openDrilldown("thisMonth")} />
          <StatCard label="Today's Expenses" value={formatCurrency(dashboardSummary.today)} caption="Only today's expenses" icon={<CalendarDays size={18} />} onClick={() => openDrilldown("today")} />
          <StatCard label="Category Wise Expenses" value={formatCurrency(dashboardSummary.category)} caption={selectedCategory ? `${selectedCategory.categoryName} | ${dashboardSummary.categoryCount} records` : `All categories | ${dashboardSummary.categoryCount} records`} icon={<Layers3 size={18} />} onClick={openCategoryCard} />
        </div>
      }
      filterFields={
        <>
          <Select label="Expense Type" value={list.formFilters.expenseType} options={[{ label: "All", value: "" }, ...expenseTypeOptions]} onChange={(event) => list.updateFormFilters({ expenseType: event.target.value })} />
          <Select label="Category" value={list.formFilters.categoryId} options={[{ label: "All", value: "" }, ...categories.map((item) => ({ label: item.categoryName, value: String(item.id) }))]} onChange={(event) => list.updateFormFilters({ categoryId: event.target.value })} />
          <Select label="Expense Date" value={list.formFilters.datePreset} options={[
            { label: "All", value: "" },
            { label: "Today", value: "today" },
            { label: "Yesterday", value: "yesterday" },
            { label: "This Week", value: "thisWeek" },
            { label: "This Month", value: "thisMonth" },
            { label: "This Year", value: "thisYear" },
            { label: "Custom Date Range", value: "custom" }
          ]} onChange={(event) => list.updateFormFilters({ datePreset: event.target.value as DatePreset, startDate: event.target.value === "custom" ? list.formFilters.startDate : "", endDate: event.target.value === "custom" ? list.formFilters.endDate : "" })} />
          {list.formFilters.datePreset === "custom" ? (
            <>
              <Input label="Start Date" type="date" value={list.formFilters.startDate} onChange={(event) => list.updateFormFilters({ startDate: event.target.value })} />
              <Input label="End Date" type="date" value={list.formFilters.endDate} onChange={(event) => list.updateFormFilters({ endDate: event.target.value })} />
            </>
          ) : null}
          <Select label="Customer" value={list.formFilters.customerId} options={[{ label: "All", value: "" }, ...customers.map((item) => ({ label: item.name, value: String(item.id) }))]} onChange={(event) => list.updateFormFilters({ customerId: event.target.value })} />
          <Select label="Invoice" value={list.formFilters.invoiceId} options={[{ label: "All", value: "" }, ...invoices.map((item) => ({ label: item.invoiceNo, value: String(item.id) }))]} onChange={(event) => list.updateFormFilters({ invoiceId: event.target.value })} />
          <Select label="Created By" value={list.formFilters.createdByRole} options={[{ label: "All", value: "" }, { label: "Owner", value: "OWNER" }, { label: "Admin", value: "ADMIN" }, { label: "User", value: "USER" }]} onChange={(event) => list.updateFormFilters({ createdByRole: event.target.value })} />
        </>
      }
      toolbarButtons={
        <>
          {can("EXPENSES", "EXPORT") ? <Button type="button" variant="secondary" disabled={!exportRows.length} onClick={() => exportToExcel("expenses.xlsx", exportRows, visibleExpenseExportColumns)}><Download size={16} />Export</Button> : null}
          {can("EXPENSES", "ADD") ? <Button type="button" onClick={() => form.openAddForm(getEmptyForm())}><Plus size={16} />Add Expense</Button> : null}
        </>
      }
      columnSelector={{ tableName: "EXPENSES", columns: expenseColumns, visible: visibleColumns, onChange: setVisibleColumns, lockedKeys: ["type"] }}
      tableColumns={[...visibleExpenseColumns, expenseActionColumn]}
      modals={
        <>
          <Modal open={form.formOpen} title={form.editingEntity ? "Edit Expense" : "Add Expense"} onClose={form.closeForm}>
            <div className="grid gap-4 md:grid-cols-2">
              <Select label="Expense Type" requiredMark value={form.formValues.expenseType} options={expenseTypeOptions} onChange={(event) => form.setFormValues((current) => ({ ...current, expenseType: event.target.value as ExpenseType, customerId: "", invoiceId: "" }))} />
              <Select label="Category" requiredMark value={form.formValues.categoryId} options={categories.map((item) => ({ label: item.categoryName, value: String(item.id) }))} onChange={(event) => form.setFormValues((current) => ({ ...current, categoryId: event.target.value }))} />
              {form.formValues.expenseType === "CUSTOMER_RELATED" ? <Select label="Customer" requiredMark value={form.formValues.customerId} options={customers.map((item) => ({ label: item.name, value: String(item.id) }))} onChange={(event) => form.setFormValues((current) => ({ ...current, customerId: event.target.value }))} /> : null}
              {form.formValues.expenseType === "INVOICE_RELATED" ? (
                <>
                  <Select label="Invoice" requiredMark value={form.formValues.invoiceId} options={invoices.map((item) => ({ label: `${item.invoiceNo} - ${item.customerName}`, value: String(item.id) }))} onChange={(event) => form.setFormValues((current) => ({ ...current, invoiceId: event.target.value }))} />
                  <Input label="Customer" value={selectedInvoice?.customerName ?? ""} readOnly className="bg-slate-100 text-slate-600" />
                </>
              ) : null}
              <Input label="Amount" requiredMark type="number" step="0.01" value={form.formValues.amount} onChange={(event) => form.setFormValues((current) => ({ ...current, amount: event.target.value }))} />
              <Input label="Expense Date" requiredMark type="date" value={form.formValues.expenseDate} onChange={(event) => form.setFormValues((current) => ({ ...current, expenseDate: event.target.value }))} />
              <Input label="Description" value={form.formValues.description} onChange={(event) => form.setFormValues((current) => ({ ...current, description: event.target.value }))} />
              <Input label="Attachment URL" value={form.formValues.attachmentUrl} onChange={(event) => form.setFormValues((current) => ({ ...current, attachmentUrl: event.target.value }))} />
              <div className="flex justify-end gap-2 md:col-span-2">
                <Button type="button" variant="secondary" onClick={form.closeForm}>Cancel</Button>
                <Button type="button" disabled={!canSaveExpense || form.saving} onClick={submitForm}>Save Expense</Button>
              </div>
            </div>
          </Modal>
          <AuditLogModal open={Boolean(form.logsTarget)} moduleName="Expense" entityId={form.logsTarget?.id ?? null} title={form.logsTarget ? `${typeLabel(form.logsTarget.expenseType)} Expense Logs` : "Expense Logs"} onClose={form.closeLogs} />
          <CommonDeleteModal open={Boolean(form.deleteTarget)} loading={form.deleting} onCancel={form.cancelDelete} onConfirm={() => void form.confirmDelete()} />
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
        </>
      }
    />
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

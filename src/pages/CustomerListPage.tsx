import { useMemo, useState } from "react";
import { BookOpen, Download, History, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import { deleteCustomer, getCustomerLedger, getCustomersPage } from "../api/customers";
import { getCustomerProfitability } from "../api/expenses";
import { ActionDropdown } from "../components/ActionDropdown";
import { AuditLogModal } from "../components/AuditLogModal";
import { Button } from "../components/Button";
import { applyVisibleColumns } from "../components/CommonColumnSelector";
import { CommonDeleteIcon } from "../components/CommonDeleteAction";
import { CommonDeleteModal } from "../components/CommonDeleteModal";
import { CommonListPage } from "../components/CommonListPage";
import { Modal } from "../components/Modal";
import { Pagination, DEFAULT_PAGE_SIZE } from "../components/Pagination";
import { Select } from "../components/Select";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";
import { useListPage } from "../hooks/useListPage";
import { CommonErrorMessageUtil } from "../lib/CommonErrorMessageUtil";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import { formatCurrency } from "../lib/currency";
import { exportToExcel } from "../lib/excelExport";
import { formatDate } from "../lib/format";
import { notificationService } from "../services/notificationService";
import type { Customer, CustomerLedger, Profitability } from "../types/api";

type CustomerFilters = {
  search: string;
  status: string;
};

const emptyFilters: CustomerFilters = {
  search: "",
  status: "active"
};

export const CustomerListPage = () => {
  const [selectedLedger, setSelectedLedger] = useState<CustomerLedger | null>(null);
  const [selectedProfitability, setSelectedProfitability] = useState<Profitability | null>(null);
  const [ledgerCustomerId, setLedgerCustomerId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [logTarget, setLogTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const { can } = useAuth();
  const { clearMessage, setApiError } = useApiMessage();

  const list = useListPage<Customer, CustomerFilters>({
    initialFilters: emptyFilters,
    errorMessage: "Unable to load customers",
    fetchPage: ({ page, size, search, filters }) =>
      getCustomersPage({
        search: search.trim() || undefined,
        active: filters.status === "active" ? true : filters.status === "inactive" ? false : undefined,
        page,
        size
      })
  });

  const loadLedger = async (customerId: number, nextPage = 0) => {
    setLedgerCustomerId(customerId);
    const [ledger, profitability] = await Promise.all([
      getCustomerLedger(customerId, { page: nextPage, size: DEFAULT_PAGE_SIZE }),
      can("EXPENSES", "VIEW") ? getCustomerProfitability(customerId) : Promise.resolve(null)
    ]);
    setSelectedLedger(ledger);
    setSelectedProfitability(profitability);
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    try {
      setDeleting(true);
      clearMessage();
      await deleteCustomer(deleteTarget.id);
      list.refreshTable();
      setDeleteTarget(null);
      notificationService.showSuccess(CommonSuccessMessageUtil.deleted("Customer"));
    } catch (err: any) {
      setApiError(err, CommonErrorMessageUtil.deleteFailed);
    } finally {
      setDeleting(false);
    }
  };

  const customerColumns = useMemo(() => [
    {
      key: "name",
      header: "Customer",
      render: (item: Customer) => (
        <div className="min-w-[180px]">
          <p className="font-semibold text-white">{item.name}</p>
          <p className="text-xs text-slate-400">{item.mobile}</p>
        </div>
      )
    },
    {
      key: "purchase",
      header: "Total Purchase",
      className: "text-right",
      render: (item: Customer) => <span className="block text-right font-semibold text-white">{formatCurrency(item.totalPurchaseAmount)}</span>
    },
    {
      key: "paid",
      header: "Total Paid",
      className: "text-right",
      render: (item: Customer) => <span className="block text-right">{formatCurrency(item.totalPaidAmount)}</span>
    },
    {
      key: "discount",
      header: "Discount Given",
      className: "text-right",
      render: (item: Customer) => <span className="block text-right">{formatCurrency(item.totalDiscountGiven)}</span>
    },
    {
      key: "outstanding",
      header: "Outstanding Balance",
      className: "text-right",
      render: (item: Customer) => <span className="block text-right font-semibold text-rose-200">{formatCurrency(item.outstandingBalance)}</span>
    },
    { key: "lastPurchase", header: "Last Purchase", render: (item: Customer) => formatDate(item.lastPurchaseDate) },
    { key: "status", header: "Status", render: (item: Customer) => <StatusBadge label={item.active ? "ACTIVE" : "INACTIVE"} /> }
  ], []);

  const customerActionColumn = useMemo(() => ({
    key: "actions",
    header: "Actions",
    className: "text-right",
    render: (item: Customer) => (
      <ActionDropdown
        actions={[
          { label: "Ledger", icon: <BookOpen size={15} />, onClick: () => void loadLedger(item.id, 0) },
          { label: "Edit", icon: <Pencil size={15} />, to: `/customers/${item.id}/edit`, hidden: !can("CUSTOMERS", "EDIT") },
          { label: "Show Logs", icon: <History size={15} />, hidden: !can("CUSTOMERS", "LOGS"), onClick: () => setLogTarget(item) },
          { label: "Delete", icon: <CommonDeleteIcon />, danger: true, hidden: !can("CUSTOMERS", "DELETE"), onClick: () => setDeleteTarget(item) }
        ]}
      />
    )
  }), [can]);

  const visibleCustomerColumns = useMemo(() => applyVisibleColumns(customerColumns, visibleColumns), [customerColumns, visibleColumns]);
  const customerExportColumns = useMemo(() => applyVisibleColumns([
    { key: "name", header: "Customer Name" },
    { key: "mobile", header: "Mobile" },
    { key: "email", header: "Email" },
    { key: "purchase", header: "Total Purchase", value: (row: Customer) => row.totalPurchaseAmount, type: "amount" as const },
    { key: "paid", header: "Total Paid", value: (row: Customer) => row.totalPaidAmount, type: "amount" as const },
    { key: "discount", header: "Discount Given", value: (row: Customer) => row.totalDiscountGiven, type: "amount" as const },
    { key: "outstanding", header: "Outstanding Balance", value: (row: Customer) => row.outstandingBalance, type: "amount" as const },
    { key: "lastPurchase", header: "Last Purchase", value: (row: Customer) => row.lastPurchaseDate, type: "date" as const },
    { key: "status", header: "Status", value: (row: Customer) => row.active ? "Active" : "Inactive" }
  ], visibleColumns), [visibleColumns]);

  return (
    <CommonListPage<Customer, CustomerFilters>
      pageTitle="Customers"
      pageSubtitle="Review purchase totals, payments, discounts, and outstanding balances for every customer from one view."
      list={list}
      searchPlaceholder="Search Customer"
      activeFilterCount={(filters) => (filters.status !== "active" ? 1 : 0)}
      filterFields={
        <Select
          label="Status Filter"
          placeholder={null}
          value={list.formFilters.status}
          onChange={(event) => list.updateFormFilters({ status: event.target.value })}
          options={[
            { label: "All", value: "all" },
            { label: "Active Only", value: "active" },
            { label: "Inactive Only", value: "inactive" }
          ]}
        />
      }
      toolbarButtons={
        can("CUSTOMERS", "EXPORT") || can("CUSTOMERS", "ADD") ? (
          <>
            {can("CUSTOMERS", "EXPORT") ? <Button type="button" variant="secondary" disabled={!list.tableData.length} onClick={() => exportToExcel("customers.xlsx", list.tableData, customerExportColumns)}>
              <Download size={16} />
              Export Excel
            </Button> : null}
            {can("CUSTOMERS", "ADD") ? <Link to="/customers/new">
              <Button>Add customer</Button>
            </Link> : null}
          </>
        ) : null
      }
      columnSelector={{ tableName: "CUSTOMERS", columns: customerColumns, visible: visibleColumns, onChange: setVisibleColumns, lockedKeys: ["name"] }}
      tableColumns={[...visibleCustomerColumns, customerActionColumn]}
      emptyMessage="No customers match the current filters."
      fullHeight
      modals={
        <>
          <Modal open={Boolean(selectedLedger)} title="Customer ledger" onClose={() => { setSelectedLedger(null); setSelectedProfitability(null); }}>
            <div className="space-y-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">{selectedLedger?.customerName}</p>
                <p className="text-sm text-slate-300/70">Current balance: {formatCurrency(selectedLedger?.currentBalance)}</p>
              </div>
              {selectedProfitability ? (
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-slate-400">Total Purchase</p>
                    <p className="mt-2 text-xl font-bold text-white">{formatCurrency(selectedProfitability.revenue)}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-slate-400">Customer Expense</p>
                    <p className="mt-2 text-xl font-bold text-rose-200">{formatCurrency(selectedProfitability.expense)}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-slate-400">Net Revenue</p>
                    <p className="mt-2 text-xl font-bold text-emerald-200">{formatCurrency(selectedProfitability.netRevenue)}</p>
                  </div>
                </div>
              ) : null}
              <div className="flex justify-end">
                {selectedLedger ? (
                  <div className="flex justify-end"><Pagination
                    page={selectedLedger.page}
                    size={selectedLedger.size}
                    totalRecords={selectedLedger.totalRecords}
                    totalPages={selectedLedger.totalPages}
                    onPageChange={(nextPage) => {
                      if (ledgerCustomerId) {
                        void loadLedger(ledgerCustomerId, nextPage);
                      }
                    }}
                  layout="inline" /></div>
                ) : null}
              </div>
              <div className="max-h-[420px] space-y-2 overflow-auto scrollbar-thin">
                {selectedLedger?.entries.map((entry, index) => (
                  <div key={`${entry.referenceNo}-${index}`} className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">{entry.type}</p>
                        <p className="text-sm text-slate-400">{entry.referenceNo} | {formatDate(entry.entryDate)}</p>
                      </div>
                      <p className="text-sm text-sky-100">{formatCurrency(entry.runningBalance)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Modal>
          <AuditLogModal open={Boolean(logTarget)} moduleName="Customer" entityId={logTarget?.id ?? null} title={logTarget ? `${logTarget.name} Logs` : "Customer Logs"} onClose={() => setLogTarget(null)} />
          <CommonDeleteModal open={Boolean(deleteTarget)} loading={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} />
        </>
      }
    />
  );
};

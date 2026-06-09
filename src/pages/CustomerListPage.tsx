import { useEffect, useState } from "react";
import { BookOpen, Download, History, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { deleteCustomer, getCustomerLedger, getCustomersPage } from "../api/customers";
import { ActionDropdown } from "../components/ActionDropdown";
import { AuditLogModal } from "../components/AuditLogModal";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
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
import { formatCurrency } from "../lib/currency";
import { exportToExcel } from "../lib/excelExport";
import { formatDate } from "../lib/format";
import { notificationService } from "../services/notificationService";
import type { Customer, CustomerLedger, PageResponse } from "../types/api";

const emptyCustomerPage: PageResponse<Customer> = {
  records: [],
  page: 0,
  size: DEFAULT_PAGE_SIZE,
  totalRecords: 0,
  totalPages: 0
};

export const CustomerListPage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerPage, setCustomerPage] = useState<PageResponse<Customer>>(emptyCustomerPage);
  const [selectedLedger, setSelectedLedger] = useState<CustomerLedger | null>(null);
  const [ledgerCustomerId, setLedgerCustomerId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [logTarget, setLogTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { can } = useAuth();
  const { message: errorMessage, clearMessage, setApiError } = useApiMessage();

  const loadCustomers = async (nextPage = page) => {
    const active = statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;
    const response = await getCustomersPage({ search: search.trim() || undefined, active, page: nextPage, size: DEFAULT_PAGE_SIZE });
    setCustomerPage(response);
    setCustomers(response.records);
  };

  const loadLedger = async (customerId: number, nextPage = 0) => {
    setLedgerCustomerId(customerId);
    setSelectedLedger(await getCustomerLedger(customerId, { page: nextPage, size: DEFAULT_PAGE_SIZE }));
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    try {
      setDeleting(true);
      clearMessage();
      await deleteCustomer(deleteTarget.id);
      await loadCustomers(page);
      setDeleteTarget(null);
      notificationService.showSuccess(CommonSuccessMessageUtil.deleted("Customer"));
    } catch (err: any) {
      setApiError(err, CommonErrorMessageUtil.deleteFailed);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    setPage(0);
    void loadCustomers(0);
  }, [statusFilter]);

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col space-y-4 pb-6">
      <Header
        title="Customers"
        subtitle="Review purchase totals, payments, discounts, and outstanding balances for every customer from one view."
      />
      {errorMessage ? (
        <div className="glass rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">
          {errorMessage}
        </div>
      ) : null}
      <GlassCard className="flex flex-1 flex-col p-6 md:p-7">
        <div className="mb-5 flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CommonBreadcrumb items={[{ label: "Customers" }]} />
            </div>
            {can("CUSTOMERS", "EXPORT") || can("CUSTOMERS", "ADD") ? (
              <div className="flex flex-wrap gap-2">
                {can("CUSTOMERS", "EXPORT") ? <Button type="button" variant="secondary" disabled={!customers.length} onClick={() => exportToExcel("customers.xlsx", customers, [
                  { key: "name", header: "Customer Name" },
                  { key: "mobile", header: "Mobile" },
                  { key: "email", header: "Email" },
                  { key: "totalPurchaseAmount", header: "Total Purchase", type: "amount" },
                  { key: "totalPaidAmount", header: "Total Paid", type: "amount" },
                  { key: "totalDiscountGiven", header: "Discount Given", type: "amount" },
                  { key: "outstandingBalance", header: "Outstanding Balance", type: "amount" },
                  { key: "lastPurchaseDate", header: "Last Purchase", type: "date" },
                  { key: "active", header: "Status", value: (row) => row.active ? "Active" : "Inactive" }
                ])}>
                  <Download size={16} />
                  Export Excel
                </Button> : null}
                {can("CUSTOMERS", "ADD") ? <Link to="/customers/new">
                  <Button>Add customer</Button>
                </Link> : null}
              </div>
            ) : null}
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_160px]">
            <Input
              label="Search Customer"
              placeholder="Enter Customer Name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  setPage(0);
                  void loadCustomers(0);
                }
              }}
            />
            <Select
              label="Status Filter"
              placeholder={null}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              options={[
                { label: "All", value: "all" },
                { label: "Active Only", value: "active" },
                { label: "Inactive Only", value: "inactive" }
              ]}
            />
            <div className="flex items-end">
              <Button className="w-full" variant="secondary" onClick={() => { setPage(0); void loadCustomers(0); }}>
                Search
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <Table
            data={customers}
            emptyText="No customers match the current filters."
            emptyAction={can("CUSTOMERS", "ADD") ? <Link to="/customers/new"><Button>Add customer</Button></Link> : null}
            columns={[
            {
              key: "name",
              header: "Customer",
              render: (item) => (
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
              render: (item) => <span className="block text-right font-semibold text-white">{formatCurrency(item.totalPurchaseAmount)}</span>
            },
            {
              key: "paid",
              header: "Total Paid",
              className: "text-right",
              render: (item) => <span className="block text-right">{formatCurrency(item.totalPaidAmount)}</span>
            },
            {
              key: "discount",
              header: "Discount Given",
              className: "text-right",
              render: (item) => <span className="block text-right">{formatCurrency(item.totalDiscountGiven)}</span>
            },
            {
              key: "outstanding",
              header: "Outstanding Balance",
              className: "text-right",
              render: (item) => <span className="block text-right font-semibold text-rose-200">{formatCurrency(item.outstandingBalance)}</span>
            },
            { key: "lastPurchase", header: "Last Purchase", render: (item) => formatDate(item.lastPurchaseDate) },
            { key: "status", header: "Status", render: (item) => <StatusBadge label={item.active ? "ACTIVE" : "INACTIVE"} /> },
            {
              key: "actions",
              header: "Actions",
              className: "text-right",
              render: (item) => (
                <ActionDropdown
                  actions={[
                    {
                      label: "Ledger",
                      icon: <BookOpen size={15} />,
                      onClick: () => void loadLedger(item.id, 0)
                    },
                    {
                      label: "Edit",
                      icon: <Pencil size={15} />,
                      to: `/customers/${item.id}/edit`,
                      hidden: !can("CUSTOMERS", "EDIT")
                    },
                    {
                      label: "Show Logs",
                      icon: <History size={15} />,
                      hidden: !can("CUSTOMERS", "VIEW_LOGS"),
                      onClick: () => setLogTarget(item)
                    },
                    {
                      label: "Delete",
                      icon: <Trash2 size={15} />,
                      danger: true,
                      hidden: !can("CUSTOMERS", "DELETE"),
                      onClick: () => setDeleteTarget(item)
                    }
                  ]}
                />
              )
            }
            ]}
          />
        </div>
        <div className="mt-auto">
          <Pagination
          page={customerPage.page}
          size={customerPage.size}
          totalRecords={customerPage.totalRecords}
          totalPages={customerPage.totalPages}
          onPageChange={(nextPage) => {
            setPage(nextPage);
            void loadCustomers(nextPage);
          }}
          />
        </div>
      </GlassCard>

      <Modal open={Boolean(selectedLedger)} title="Customer ledger" onClose={() => setSelectedLedger(null)}>
        <div className="space-y-3">
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="font-semibold text-white">{selectedLedger?.customerName}</p>
            <p className="text-sm text-slate-300/70">Current balance: {formatCurrency(selectedLedger?.currentBalance)}</p>
          </div>
          <div className="max-h-[420px] space-y-2 overflow-auto scrollbar-thin">
            {selectedLedger?.entries.map((entry, index) => (
              <div key={`${entry.referenceNo}-${index}`} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
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
          {selectedLedger ? (
            <Pagination
              page={selectedLedger.page}
              size={selectedLedger.size}
              totalRecords={selectedLedger.totalRecords}
              totalPages={selectedLedger.totalPages}
              onPageChange={(nextPage) => {
                if (ledgerCustomerId) {
                  void loadLedger(ledgerCustomerId, nextPage);
                }
              }}
            />
          ) : null}
        </div>
      </Modal>
      <AuditLogModal open={Boolean(logTarget)} moduleName="Customer" entityId={logTarget?.id ?? null} title="Customer Change History" onClose={() => setLogTarget(null)} />
      <CommonDeleteModal open={Boolean(deleteTarget)} loading={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} />
    </div>
  );
};

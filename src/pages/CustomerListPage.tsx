import { useEffect, useState } from "react";
import { BookOpen, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { deleteCustomer, getCustomerLedger, getCustomersPage } from "../api/customers";
import { ActionDropdown } from "../components/ActionDropdown";
import { Button } from "../components/Button";
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
import { formatCurrency } from "../lib/currency";
import { formatDate } from "../lib/format";
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

  useEffect(() => {
    setPage(0);
    void loadCustomers(0);
  }, [statusFilter]);

  return (
    <div className="space-y-4 pb-6">
      <Header
        title="Customers"
        subtitle="Review purchase totals, payments, discounts, and outstanding balances for every customer from one view."
      />
      {errorMessage ? (
        <div className="glass rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">
          {errorMessage}
        </div>
      ) : null}
      <GlassCard className="p-6 md:p-7">
        <div className="mb-5 flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Customer registry</p>
              <h2 className="mt-2 text-2xl font-bold text-white">All customers</h2>
            </div>
            {can("CUSTOMERS", "ADD") ? (
              <Link to="/customers/new">
                <Button>Add customer</Button>
              </Link>
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
                { label: "All Customers", value: "all" },
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

        <Table
          data={customers}
          emptyText="No customers match the current filters."
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
                      label: "Delete",
                      icon: <Trash2 size={15} />,
                      danger: true,
                      hidden: !can("CUSTOMERS", "DELETE"),
                      onClick: () =>
                        void deleteCustomer(item.id)
                          .then(() => {
                            clearMessage();
                            return loadCustomers(page);
                          })
                          .catch((err: any) => {
                            setApiError(err, "Unable to delete customer");
                          })
                    }
                  ]}
                />
              )
            }
          ]}
        />
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
    </div>
  );
};

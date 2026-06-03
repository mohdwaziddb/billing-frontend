import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteCustomer, getCustomerLedger, getCustomers } from "../api/customers";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { Select } from "../components/Select";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { useApiMessage } from "../hooks/useApiFeedback";
import { formatCurrency } from "../lib/currency";
import { formatDate } from "../lib/format";
import type { Customer, CustomerLedger } from "../types/api";

export const CustomerListPage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedLedger, setSelectedLedger] = useState<CustomerLedger | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const { message: errorMessage, clearMessage, setApiError } = useApiMessage();

  const loadCustomers = async () => {
    const active = statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;
    setCustomers(await getCustomers({ search: search.trim() || undefined, active }));
  };

  useEffect(() => {
    void loadCustomers();
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
            <Link to="/customers/new">
              <Button>Add customer</Button>
            </Link>
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
                  void loadCustomers();
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
              <Button className="w-full" variant="secondary" onClick={() => void loadCustomers()}>
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
                  <p className="mt-2 text-xs text-slate-500">Credit limit: {formatCurrency(item.creditLimit)}</p>
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
              render: (item) => (
                <div className="grid min-w-[230px] grid-cols-3 items-center gap-2">
                  <Button className="w-full min-h-10 px-3" variant="ghost" onClick={() => void getCustomerLedger(item.id).then(setSelectedLedger)}>
                    Ledger
                  </Button>
                  <Link className="block" to={`/customers/${item.id}/edit`}>
                    <Button className="w-full min-h-10 px-3" variant="secondary">Edit</Button>
                  </Link>
                  <Button
                    className="w-full min-h-10 px-3"
                    variant="danger"
                    onClick={() =>
                      void deleteCustomer(item.id)
                        .then(() => {
                          clearMessage();
                          return loadCustomers();
                        })
                        .catch((err: any) => {
                          setApiError(err, "Unable to delete customer");
                        })
                    }
                  >
                    Delete
                  </Button>
                </div>
              )
            }
          ]}
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
        </div>
      </Modal>
    </div>
  );
};

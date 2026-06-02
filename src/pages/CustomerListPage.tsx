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
import { formatCurrency } from "../lib/currency";
import { formatDate } from "../lib/format";
import { useApiMessage } from "../hooks/useApiFeedback";
import type { Customer, CustomerLedger } from "../types/api";

export const CustomerListPage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedLedger, setSelectedLedger] = useState<CustomerLedger | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const { message: errorMessage, clearMessage, setApiError } = useApiMessage();

  const loadCustomers = async () => {
    const active =
      statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;
    setCustomers(await getCustomers({ search: search.trim() || undefined, active }));
  };

  useEffect(() => {
    void loadCustomers();
  }, [statusFilter]);

  return (
    <div className="space-y-4">
      <Header
        title="Customer list"
        subtitle="Manage customers, receivables, credit exposure, and ledger visibility without moving business rules into the client."
      />
      {errorMessage ? (
        <div className="glass rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">
          {errorMessage}
        </div>
      ) : null}
      <GlassCard className="p-6">
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
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_140px]">
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
          columns={[
            {
              key: "name",
              header: "Customer",
              render: (item) => (
                <div>
                  <p className="font-semibold text-white">{item.name}</p>
                  <p className="text-xs text-slate-400">{item.mobile}</p>
                </div>
              )
            },
            { key: "balance", header: "Current Balance", render: (item) => formatCurrency(item.currentBalance) },
            { key: "limit", header: "Credit Limit", render: (item) => formatCurrency(item.creditLimit) },
            { key: "active", header: "Status", render: (item) => <StatusBadge label={item.active ? "ACTIVE" : "INACTIVE"} /> },
            { key: "updated", header: "Updated", render: (item) => formatDate(item.updatedAt) },
            {
              key: "actions",
              header: "Actions",
              render: (item) => (
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => void getCustomerLedger(item.id).then(setSelectedLedger)}>
                    Ledger
                  </Button>
                  <Link to={`/customers/${item.id}/edit`}>
                    <Button variant="secondary">Edit</Button>
                  </Link>
                  <Button
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
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="font-semibold text-white">{selectedLedger?.customerName}</p>
            <p className="text-sm text-slate-300/70">Current balance: {formatCurrency(selectedLedger?.currentBalance)}</p>
          </div>
          <div className="max-h-[420px] space-y-2 overflow-auto scrollbar-thin">
            {selectedLedger?.entries.map((entry, index) => (
              <div key={`${entry.referenceNo}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-white">{entry.type}</p>
                    <p className="text-sm text-slate-400">
                      {entry.referenceNo} | {formatDate(entry.entryDate)}
                    </p>
                  </div>
                  <p className="text-sm text-cyan-100">{formatCurrency(entry.runningBalance)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

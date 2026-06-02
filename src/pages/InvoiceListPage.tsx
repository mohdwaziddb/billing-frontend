import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteInvoice, getInvoices } from "../api/invoices";
import { Button } from "../components/Button";
import { Header } from "../components/Header";
import { GlassCard } from "../components/GlassCard";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { formatCurrency } from "../lib/currency";
import { formatDate } from "../lib/format";
import type { Invoice } from "../types/api";

export const InvoiceListPage = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const loadInvoices = async () => {
    setInvoices(await getInvoices());
  };

  useEffect(() => {
    void loadInvoices();
  }, []);

  return (
    <div className="space-y-4">
      <Header title="Invoice list" subtitle="Review backend-computed invoice totals, balances, and payment status with a clean financial operations view." />
      <GlassCard className="p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Invoice ledger</p>
            <h2 className="mt-2 text-2xl font-bold text-white">All invoices</h2>
          </div>
          <Link to="/invoices/new">
            <Button>Create invoice</Button>
          </Link>
        </div>
        <Table
          data={invoices}
          columns={[
            { key: "invoice", header: "Invoice", render: (item) => item.invoiceNo },
            { key: "customer", header: "Customer", render: (item) => item.customerName },
            { key: "date", header: "Date", render: (item) => formatDate(item.invoiceDate) },
            { key: "total", header: "Total", render: (item) => formatCurrency(item.totalAmount) },
            { key: "balance", header: "Balance", render: (item) => formatCurrency(item.balanceAmount) },
            { key: "status", header: "Status", render: (item) => <StatusBadge label={item.paymentStatus} /> },
            {
              key: "actions",
              header: "Actions",
              render: (item) => (
                <div className="flex flex-wrap gap-2">
                  <Link to={`/invoices/${item.id}`}>
                    <Button variant="secondary">View</Button>
                  </Link>
                  <Button variant="danger" onClick={() => void deleteInvoice(item.id).then(loadInvoices)}>
                    Delete
                  </Button>
                </div>
              )
            }
          ]}
        />
      </GlassCard>
    </div>
  );
};

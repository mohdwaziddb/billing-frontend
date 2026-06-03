import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteInvoice, getInvoices } from "../api/invoices";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
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
    <div className="space-y-4 pb-6">
      <Header
        title="Invoices"
        subtitle="Review invoice numbering, customer identity, totals, and balances from one billing ledger."
      />
      <GlassCard className="p-6 md:p-7">
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
          emptyText="No invoices have been created yet."
          columns={[
            { key: "invoice", header: "Invoice Number", render: (item) => <span className="font-semibold text-white">{item.invoiceNo}</span> },
            {
              key: "customer",
              header: "Customer Name",
              render: (item) => (
                <div>
                  <p className="font-semibold text-white">{item.customerName}</p>
                  <p className="text-xs text-slate-400">{item.customerMobile}</p>
                </div>
              )
            },
            { key: "mobile", header: "Mobile Number", render: (item) => item.customerMobile },
            { key: "date", header: "Invoice Date", render: (item) => formatDate(item.invoiceDate) },
            {
              key: "total",
              header: "Amount",
              className: "text-right",
              render: (item) => <span className="block text-right font-semibold text-white">{formatCurrency(item.totalAmount)}</span>
            },
            {
              key: "balance",
              header: "Balance",
              className: "text-right",
              render: (item) => <span className="block text-right text-rose-200">{formatCurrency(item.balanceAmount)}</span>
            },
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

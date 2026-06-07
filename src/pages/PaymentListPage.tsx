import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getPaymentsPage } from "../api/payments";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { DEFAULT_PAGE_SIZE, Pagination } from "../components/Pagination";
import { Table } from "../components/Table";
import { formatCurrency } from "../lib/currency";
import { formatDate } from "../lib/format";
import type { PageResponse, Payment } from "../types/api";

const emptyPaymentPage: PageResponse<Payment> = {
  records: [],
  page: 0,
  size: DEFAULT_PAGE_SIZE,
  totalRecords: 0,
  totalPages: 0
};

export const PaymentListPage = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentPage, setPaymentPage] = useState<PageResponse<Payment>>(emptyPaymentPage);
  const [page, setPage] = useState(0);

  const loadPayments = async (nextPage = page) => {
    const response = await getPaymentsPage({ page: nextPage, size: DEFAULT_PAGE_SIZE });
    setPaymentPage(response);
    setPayments(response.records);
  };

  useEffect(() => {
    void loadPayments(0);
  }, []);

  return (
    <div className="space-y-4 pb-6">
      <Header
        title="Payments"
        subtitle="Review customer collections and invoice-linked payment activity."
      />
      <GlassCard className="p-6 md:p-7">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Collections</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Payment records</h2>
          </div>
          <Link to="/payments/new">
            <Button>Add payment</Button>
          </Link>
        </div>

        <Table
          data={payments}
          emptyText="No payments recorded yet."
          columns={[
            {
              key: "customer",
              header: "Customer",
              render: (item) => (
                <div>
                  <p className="font-semibold text-white">{item.customerName}</p>
                  <p className="text-xs text-slate-400">{item.invoiceNo ?? "Unapplied"}</p>
                </div>
              )
            },
            { key: "date", header: "Payment Date", render: (item) => formatDate(item.paymentDate) },
            { key: "mode", header: "Mode", render: (item) => item.mode.replace(/_/g, " ") },
            { key: "remarks", header: "Remarks", render: (item) => item.remarks ?? "--" },
            {
              key: "amount",
              header: "Amount",
              className: "text-right",
              render: (item) => <span className="block text-right font-semibold text-white">{formatCurrency(item.amount)}</span>
            }
          ]}
        />
        <Pagination
          page={paymentPage.page}
          size={paymentPage.size}
          totalRecords={paymentPage.totalRecords}
          totalPages={paymentPage.totalPages}
          onPageChange={(nextPage) => {
            setPage(nextPage);
            void loadPayments(nextPage);
          }}
        />
      </GlassCard>
    </div>
  );
};

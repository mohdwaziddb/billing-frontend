import { useEffect, useState } from "react";
import { Eye, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { deleteInvoice, getInvoicesPage } from "../api/invoices";
import { ActionDropdown } from "../components/ActionDropdown";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { DEFAULT_PAGE_SIZE, Pagination } from "../components/Pagination";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../lib/currency";
import { formatDate } from "../lib/format";
import type { Invoice, PageResponse } from "../types/api";

const emptyInvoicePage: PageResponse<Invoice> = {
  records: [],
  page: 0,
  size: DEFAULT_PAGE_SIZE,
  totalRecords: 0,
  totalPages: 0
};

export const InvoiceListPage = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicePage, setInvoicePage] = useState<PageResponse<Invoice>>(emptyInvoicePage);
  const [page, setPage] = useState(0);
  const { can } = useAuth();

  const loadInvoices = async (nextPage = page) => {
    const response = await getInvoicesPage({ page: nextPage, size: DEFAULT_PAGE_SIZE });
    setInvoicePage(response);
    setInvoices(response.records);
  };

  useEffect(() => {
    void loadInvoices(0);
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
          {can("CREATE_INVOICE", "ADD") ? (
            <Link to="/create-invoice">
              <Button>Create invoice</Button>
            </Link>
          ) : null}
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
            { key: "createdBy", header: "Created By", render: (item) => item.createdBy ?? "--" },
            { key: "updatedBy", header: "Updated By", render: (item) => item.updatedBy ?? "--" },
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
              className: "text-right",
              render: (item) => (
                <ActionDropdown
                  actions={[
                    {
                      label: "View",
                      icon: <Eye size={15} />,
                      to: `/invoices/${item.id}`
                    },
                    {
                      label: "Delete",
                      icon: <Trash2 size={15} />,
                      danger: true,
                      hidden: !can("INVOICES", "DELETE"),
                      onClick: () => void deleteInvoice(item.id).then(() => loadInvoices(page))
                    }
                  ]}
                />
              )
            }
          ]}
        />
        <Pagination
          page={invoicePage.page}
          size={invoicePage.size}
          totalRecords={invoicePage.totalRecords}
          totalPages={invoicePage.totalPages}
          onPageChange={(nextPage) => {
            setPage(nextPage);
            void loadInvoices(nextPage);
          }}
        />
      </GlassCard>
    </div>
  );
};

import { useEffect, useMemo, useState } from "react";
import { Download, ReceiptIndianRupee } from "lucide-react";
import { getGstSummaryReport } from "../api/gstReports";
import { Button } from "../components/Button";
import { CommonAdvancedFilterPanel } from "../components/CommonAdvancedFilterPanel";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { StatCard } from "../components/StatCard";
import { Table } from "../components/Table";
import { useApiMessage } from "../hooks/useApiFeedback";
import { formatCurrency } from "../lib/currency";
import { exportToExcel } from "../lib/excelExport";
import { formatDate } from "../lib/format";
import type { GstCustomerWiseRow, GstHsnSummaryRow, GstInvoiceWiseRow, GstMonthWiseRow, GstReport, GstTaxWiseRow } from "../types/api";

type TabKey = "invoiceWise" | "customerWise" | "monthWise" | "taxWise" | "hsnSummary";

const emptyReport: GstReport = {
  startDate: null,
  endDate: null,
  totalInvoices: 0,
  taxableAmount: 0,
  cgstAmount: 0,
  sgstAmount: 0,
  igstAmount: 0,
  totalTaxAmount: 0,
  grandTotal: 0,
  invoiceWise: [],
  customerWise: [],
  monthWise: [],
  taxWise: [],
  hsnSummary: []
};

export const GstSummaryPage = () => {
  const { setApiError } = useApiMessage();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("invoiceWise");
  const [report, setReport] = useState<GstReport>(emptyReport);

  useEffect(() => {
    void getGstSummaryReport({ startDate: startDate || undefined, endDate: endDate || undefined })
      .then(setReport)
      .catch((err: any) => setApiError(err, "Unable to load GST summary"));
  }, [endDate, setApiError, startDate]);

  const activeFilters = useMemo(() => {
    const rows: string[] = [];
    if (startDate || endDate) {
      rows.push(`${formatDate(startDate) || "Start"} - ${formatDate(endDate) || "End"}`);
    }
    return rows;
  }, [endDate, startDate]);

  const exportCurrent = () => {
    if (activeTab === "invoiceWise") {
      exportToExcel("gst-invoice-wise.xlsx", report.invoiceWise, [
        { key: "invoiceNo", header: "Invoice No" },
        { key: "invoiceDate", header: "Invoice Date", type: "date" },
        { key: "customerName", header: "Customer" },
        { key: "customerState", header: "State" },
        { key: "customerGstin", header: "GSTIN" },
        { key: "taxableAmount", header: "Taxable", type: "amount" },
        { key: "cgstAmount", header: "CGST", type: "amount" },
        { key: "sgstAmount", header: "SGST", type: "amount" },
        { key: "igstAmount", header: "IGST", type: "amount" },
        { key: "totalTaxAmount", header: "Total Tax", type: "amount" },
        { key: "grandTotal", header: "Grand Total", type: "amount" }
      ]);
      return;
    }
    if (activeTab === "customerWise") {
      exportToExcel("gst-customer-wise.xlsx", report.customerWise, [
        { key: "customerName", header: "Customer" },
        { key: "customerGstin", header: "GSTIN" },
        { key: "invoiceCount", header: "Invoices" },
        { key: "taxableAmount", header: "Taxable", type: "amount" },
        { key: "cgstAmount", header: "CGST", type: "amount" },
        { key: "sgstAmount", header: "SGST", type: "amount" },
        { key: "igstAmount", header: "IGST", type: "amount" },
        { key: "totalTaxAmount", header: "Total Tax", type: "amount" },
        { key: "grandTotal", header: "Grand Total", type: "amount" }
      ]);
      return;
    }
    if (activeTab === "monthWise") {
      exportToExcel("gst-month-wise.xlsx", report.monthWise, [
        { key: "monthLabel", header: "Month" },
        { key: "invoiceCount", header: "Invoices" },
        { key: "taxableAmount", header: "Taxable", type: "amount" },
        { key: "cgstAmount", header: "CGST", type: "amount" },
        { key: "sgstAmount", header: "SGST", type: "amount" },
        { key: "igstAmount", header: "IGST", type: "amount" },
        { key: "totalTaxAmount", header: "Total Tax", type: "amount" },
        { key: "grandTotal", header: "Grand Total", type: "amount" }
      ]);
      return;
    }
    if (activeTab === "taxWise") {
      exportToExcel("gst-tax-wise.xlsx", report.taxWise, [
        { key: "taxName", header: "Tax Name" },
        { key: "taxCode", header: "Tax Code" },
        { key: "taxType", header: "Tax Type" },
        { key: "taxRate", header: "Rate" },
        { key: "lineCount", header: "Lines" },
        { key: "taxableAmount", header: "Taxable", type: "amount" },
        { key: "cgstAmount", header: "CGST", type: "amount" },
        { key: "sgstAmount", header: "SGST", type: "amount" },
        { key: "igstAmount", header: "IGST", type: "amount" },
        { key: "totalTaxAmount", header: "Total Tax", type: "amount" },
        { key: "grandAmount", header: "Grand Amount", type: "amount" }
      ]);
      return;
    }
    exportToExcel("gst-hsn-summary.xlsx", report.hsnSummary, [
      { key: "hsnCode", header: "HSN Code" },
      { key: "totalQuantity", header: "Quantity" },
      { key: "lineCount", header: "Lines" },
      { key: "taxableAmount", header: "Taxable", type: "amount" },
      { key: "cgstAmount", header: "CGST", type: "amount" },
      { key: "sgstAmount", header: "SGST", type: "amount" },
      { key: "igstAmount", header: "IGST", type: "amount" },
      { key: "totalTaxAmount", header: "Total Tax", type: "amount" },
      { key: "grandAmount", header: "Grand Amount", type: "amount" }
    ]);
  };

  return (
    <div className="space-y-4 pb-6">
      <Header title="GST Summary" subtitle="Snapshot-based GST reporting for invoice wise, customer wise, month wise, tax wise, and HSN wise summaries." />
      <CommonAdvancedFilterPanel
        title="GST Filters"
        eyebrow="Report Filters"
        expanded={filtersOpen}
        activeFilters={activeFilters}
        onToggle={() => setFiltersOpen((current) => !current)}
        onClearAll={() => {
          setStartDate("");
          setEndDate("");
        }}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input label="Start Date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          <Input label="End Date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </div>
      </CommonAdvancedFilterPanel>

      <GlassCard className="p-6 md:p-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CommonBreadcrumb items={[{ label: "Reports" }, { label: "GST Summary" }]} />
          <Button type="button" variant="secondary" onClick={exportCurrent}>
            <Download size={16} />
            Export Current View
          </Button>
        </div>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Invoices" value={String(report.totalInvoices)} caption="GST-bearing invoice snapshots" icon={<ReceiptIndianRupee size={18} />} />
        <StatCard label="Taxable Value" value={formatCurrency(report.taxableAmount)} caption="Taxable base in selected range" icon={<ReceiptIndianRupee size={18} />} />
        <StatCard label="CGST" value={formatCurrency(report.cgstAmount)} caption="Same-state CGST total" icon={<ReceiptIndianRupee size={18} />} />
        <StatCard label="SGST" value={formatCurrency(report.sgstAmount)} caption="Same-state SGST total" icon={<ReceiptIndianRupee size={18} />} />
        <StatCard label="IGST" value={formatCurrency(report.igstAmount)} caption="Interstate IGST total" icon={<ReceiptIndianRupee size={18} />} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total GST" value={formatCurrency(report.totalTaxAmount)} caption="CGST + SGST + IGST" />
        <StatCard label="Grand Total" value={formatCurrency(report.grandTotal)} caption="Invoice totals including tax" />
        <GlassCard className="p-4">
          <Select
            label="Report View"
            value={activeTab}
            placeholder={null}
            onChange={(event) => setActiveTab(event.target.value as TabKey)}
            options={[
              { label: "Invoice Wise", value: "invoiceWise" },
              { label: "Customer Wise", value: "customerWise" },
              { label: "Month Wise", value: "monthWise" },
              { label: "Tax Wise", value: "taxWise" },
              { label: "HSN Summary", value: "hsnSummary" }
            ]}
          />
        </GlassCard>
      </div>

      <GlassCard className="p-6 md:p-7">
        {activeTab === "invoiceWise" ? <InvoiceWiseTable rows={report.invoiceWise} /> : null}
        {activeTab === "customerWise" ? <CustomerWiseTable rows={report.customerWise} /> : null}
        {activeTab === "monthWise" ? <MonthWiseTable rows={report.monthWise} /> : null}
        {activeTab === "taxWise" ? <TaxWiseTable rows={report.taxWise} /> : null}
        {activeTab === "hsnSummary" ? <HsnSummaryTable rows={report.hsnSummary} /> : null}
      </GlassCard>
    </div>
  );
};

const InvoiceWiseTable = ({ rows }: { rows: GstInvoiceWiseRow[] }) => (
  <Table
    data={rows}
    emptyText="No GST invoice data found."
    columns={[
      { key: "invoiceNo", header: "Invoice", render: (item) => item.invoiceNo },
      { key: "invoiceDate", header: "Date", render: (item) => formatDate(item.invoiceDate) },
      { key: "customerName", header: "Customer", render: (item) => item.customerName },
      { key: "customerState", header: "Place of Supply", render: (item) => item.customerState ?? "--" },
      { key: "taxableAmount", header: "Taxable", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.taxableAmount)}</span> },
      { key: "cgstAmount", header: "CGST", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.cgstAmount)}</span> },
      { key: "sgstAmount", header: "SGST", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.sgstAmount)}</span> },
      { key: "igstAmount", header: "IGST", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.igstAmount)}</span> },
      { key: "grandTotal", header: "Grand Total", className: "text-right", render: (item) => <span className="block text-right font-semibold">{formatCurrency(item.grandTotal)}</span> }
    ]}
  />
);

const CustomerWiseTable = ({ rows }: { rows: GstCustomerWiseRow[] }) => (
  <Table
    data={rows}
    emptyText="No GST customer summary found."
    columns={[
      { key: "customerName", header: "Customer", render: (item) => item.customerName },
      { key: "customerGstin", header: "GSTIN", render: (item) => item.customerGstin ?? "--" },
      { key: "invoiceCount", header: "Invoices", className: "text-right", render: (item) => <span className="block text-right">{item.invoiceCount}</span> },
      { key: "taxableAmount", header: "Taxable", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.taxableAmount)}</span> },
      { key: "totalTaxAmount", header: "Total GST", className: "text-right", render: (item) => <span className="block text-right font-semibold">{formatCurrency(item.totalTaxAmount)}</span> },
      { key: "grandTotal", header: "Grand Total", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.grandTotal)}</span> }
    ]}
  />
);

const MonthWiseTable = ({ rows }: { rows: GstMonthWiseRow[] }) => (
  <Table
    data={rows}
    emptyText="No GST month summary found."
    columns={[
      { key: "monthLabel", header: "Month", render: (item) => item.monthLabel },
      { key: "invoiceCount", header: "Invoices", className: "text-right", render: (item) => <span className="block text-right">{item.invoiceCount}</span> },
      { key: "taxableAmount", header: "Taxable", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.taxableAmount)}</span> },
      { key: "cgstAmount", header: "CGST", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.cgstAmount)}</span> },
      { key: "sgstAmount", header: "SGST", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.sgstAmount)}</span> },
      { key: "igstAmount", header: "IGST", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.igstAmount)}</span> },
      { key: "grandTotal", header: "Grand Total", className: "text-right", render: (item) => <span className="block text-right font-semibold">{formatCurrency(item.grandTotal)}</span> }
    ]}
  />
);

const TaxWiseTable = ({ rows }: { rows: GstTaxWiseRow[] }) => (
  <Table
    data={rows}
    emptyText="No GST tax summary found."
    columns={[
      { key: "taxName", header: "Tax Name", render: (item) => item.taxName ?? "--" },
      { key: "taxCode", header: "Tax Code", render: (item) => item.taxCode ?? "--" },
      { key: "taxType", header: "Tax Type", render: (item) => item.taxType ?? "--" },
      { key: "taxRate", header: "Rate", className: "text-right", render: (item) => <span className="block text-right">{item.taxRate}%</span> },
      { key: "lineCount", header: "Lines", className: "text-right", render: (item) => <span className="block text-right">{item.lineCount}</span> },
      { key: "taxableAmount", header: "Taxable", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.taxableAmount)}</span> },
      { key: "totalTaxAmount", header: "Total GST", className: "text-right", render: (item) => <span className="block text-right font-semibold">{formatCurrency(item.totalTaxAmount)}</span> }
    ]}
  />
);

const HsnSummaryTable = ({ rows }: { rows: GstHsnSummaryRow[] }) => (
  <Table
    data={rows}
    emptyText="No GST HSN summary found."
    columns={[
      { key: "hsnCode", header: "HSN Code", render: (item) => item.hsnCode },
      { key: "totalQuantity", header: "Quantity", className: "text-right", render: (item) => <span className="block text-right">{item.totalQuantity}</span> },
      { key: "lineCount", header: "Lines", className: "text-right", render: (item) => <span className="block text-right">{item.lineCount}</span> },
      { key: "taxableAmount", header: "Taxable", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.taxableAmount)}</span> },
      { key: "totalTaxAmount", header: "Total GST", className: "text-right", render: (item) => <span className="block text-right font-semibold">{formatCurrency(item.totalTaxAmount)}</span> },
      { key: "grandAmount", header: "Grand Amount", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.grandAmount)}</span> }
    ]}
  />
);

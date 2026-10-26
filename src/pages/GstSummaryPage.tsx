import { useEffect, useMemo, useState } from "react";
import { Download, Globe2, Landmark, Percent, ReceiptIndianRupee } from "lucide-react";
import { getGstSummaryReport } from "../api/gstReports";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Pagination } from "../components/Pagination";
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

const GST_TABLE_PAGE_SIZE = 50;

type GstPreset ="today" | "yesterday" | "thisWeek" | "thisMonth" | "thisYear" | "custom";

// Profit & Loss jaise hi date presets.
const GST_PRESETS: Array<{ value: GstPreset; label: string }> = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "thisWeek", label: "This Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "thisYear", label: "This Year" },
  { value: "custom", label: "Custom Range" }
];

const TABS: Array<{ value: TabKey; label: string }> = [
  { value: "invoiceWise", label: "Invoice wise" },
  { value: "customerWise", label: "Customer wise" },
  { value: "monthWise", label: "Month wise" },
  { value: "taxWise", label: "Tax rate wise" },
  { value: "hsnSummary", label: "HSN summary" }
];

const isoDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;

const gstRange = (preset: GstPreset) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (preset === "today") return { startDate: isoDate(today), endDate: isoDate(today) };
  if (preset === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return { startDate: isoDate(yesterday), endDate: isoDate(yesterday) };
  }
  if (preset === "thisWeek") {
    const start = new Date(today);
    start.setDate(start.getDate() - ((start.getDay() || 7) - 1));
    return { startDate: isoDate(start), endDate: isoDate(today) };
  }
  if (preset === "thisMonth") return { startDate: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)), endDate: isoDate(today) };
  return { startDate: isoDate(new Date(today.getFullYear(), 0, 1)), endDate: isoDate(today) };
};

export const GstSummaryPage = () => {
  const { setApiError } = useApiMessage();
  const [preset, setPreset] = useState<GstPreset>("thisYear");
  const [customRange, setCustomRange] = useState(() => gstRange("thisMonth"));
  const [activeTab, setActiveTab] = useState<TabKey>("invoiceWise");
  const [report, setReport] = useState<GstReport>(emptyReport);
  const [loading, setLoading] = useState(true);

  const appliedFilters = useMemo(() => (preset === "custom" ? customRange : gstRange(preset)), [preset, customRange]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getGstSummaryReport({ startDate: appliedFilters.startDate || undefined, endDate: appliedFilters.endDate || undefined })
      .then((reportData) => {
        if (!cancelled) setReport(reportData);
      })
      .catch((err: any) => setApiError(err, "Unable to load GST summary"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appliedFilters, setApiError]);

  // Perf: "This Year" par invoice-wise me hazaron rows ek saath DOM me render hoti thi.
  // Ab table client-side page me (export abhi bhi poora data deta hai).
  const [tablePage, setTablePage] = useState(0);
  useEffect(() => {
    setTablePage(0);
  }, [activeTab, report]);
  const activeRowCount = report[activeTab].length;
  const tableTotalPages = Math.max(1, Math.ceil(activeRowCount / GST_TABLE_PAGE_SIZE));
  const pageSlice = <T,>(rows: T[]) => rows.slice(tablePage * GST_TABLE_PAGE_SIZE, (tablePage + 1) * GST_TABLE_PAGE_SIZE);

  const periodText = appliedFilters.startDate || appliedFilters.endDate
    ? `Period: ${formatDate(appliedFilters.startDate) || "Start"} to ${formatDate(appliedFilters.endDate) || "Today"}`
    : "Period: All dates";
  const activeTabLabel = TABS.find((tab) => tab.value === activeTab)?.label ?? "";
  const exportOptions = (view: string) => ({
    title: `GST Summary - ${view}`,
    filters: periodText,
    summary: [
      { label: "Taxable", value: formatCurrency(report.taxableAmount) },
      { label: "Total GST", value: formatCurrency(report.totalTaxAmount) },
      { label: "Grand Total", value: formatCurrency(report.grandTotal) }
    ]
  });

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
      ], exportOptions("Invoice Wise"));
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
      ], exportOptions("Customer Wise"));
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
      ], exportOptions("Month Wise"));
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
      ], exportOptions("Tax Rate Wise"));
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
    ], exportOptions("HSN Summary"));
  };

  return (
    <div className="space-y-4 pb-6">
      <Header title="GST Summary" subtitle="Output GST collected on invoices — invoice, customer, month, tax-rate and HSN wise, ready for GSTR-1 / 3B." />

      {/* Dashboard jaisa: heading left, period filter right. */}
      <GlassCard className="p-4 md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="fs-11 uppercase tracking-[0.18em] text-slate-400">Filters</p>
            <h2 className="fs-18 mt-1.5 font-semibold text-slate-950">GST Summary Filters</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {GST_PRESETS.map(({ value, label }) => (
              <Button key={value} type="button" variant={preset === value ? "primary" : "secondary"} onClick={() => setPreset(value)}>
                {label}
              </Button>
            ))}
          </div>
        </div>
        {preset === "custom" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:max-w-xl">
            <Input label="Start Date" type="date" value={customRange.startDate} onChange={(event) => setCustomRange((current) => ({ ...current, startDate: event.target.value }))} />
            <Input label="End Date" type="date" value={customRange.endDate} onChange={(event) => setCustomRange((current) => ({ ...current, endDate: event.target.value }))} />
          </div>
        ) : null}
      </GlassCard>

      {/* 5 cards ek row: pehle 7 cards do rows me the (do khaali icon box ke saath) aur "Report View" alag card me. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Taxable Value" value={formatCurrency(report.taxableAmount)} caption={`${report.totalInvoices} invoice${report.totalInvoices === 1 ? "" : "s"}`} icon={<ReceiptIndianRupee size={18} />} />
        <StatCard label="CGST" value={formatCurrency(report.cgstAmount)} caption="Same-state supply" icon={<Landmark size={18} />} />
        <StatCard label="SGST" value={formatCurrency(report.sgstAmount)} caption="Same-state supply" icon={<Landmark size={18} />} />
        <StatCard label="IGST" value={formatCurrency(report.igstAmount)} caption="Inter-state supply" icon={<Globe2 size={18} />} />
        <StatCard
          label="Total GST"
          value={formatCurrency(report.totalTaxAmount)}
          caption={report.otherTaxAmount ? `+ ${formatCurrency(report.otherTaxAmount)} VAT / non-GST` : `Invoice total ${formatCurrency(report.grandTotal)}`}
          icon={<Percent size={18} />}
        />
      </div>

      <GlassCard className="p-5 md:p-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1 rounded-[var(--radius-control)] border border-slate-200 bg-slate-50 p-1" role="tablist" aria-label="GST report view">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.value}
                className={`rounded-[calc(var(--radius-control)-2px)] px-3 py-1.5 text-sm font-semibold transition ${activeTab === tab.value ? "bg-white text-[var(--theme-color)] shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                onClick={() => setActiveTab(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {activeRowCount > GST_TABLE_PAGE_SIZE ? (
              <Pagination
                page={tablePage}
                size={GST_TABLE_PAGE_SIZE}
                totalRecords={activeRowCount}
                totalPages={tableTotalPages}
                onPageChange={setTablePage}
                layout="inline"
              />
            ) : null}
            <Button type="button" variant="secondary" onClick={exportCurrent} disabled={loading}>
              <Download size={16} />
              Export {activeTabLabel}
            </Button>
          </div>
        </div>
        {activeTab === "invoiceWise" ? <InvoiceWiseTable rows={pageSlice(report.invoiceWise)} /> : null}
        {activeTab === "customerWise" ? <CustomerWiseTable rows={pageSlice(report.customerWise)} /> : null}
        {activeTab === "monthWise" ? <MonthWiseTable rows={pageSlice(report.monthWise)} /> : null}
        {activeTab === "taxWise" ? <TaxWiseTable rows={pageSlice(report.taxWise)} /> : null}
        {activeTab === "hsnSummary" ? <HsnSummaryTable rows={pageSlice(report.hsnSummary)} /> : null}
        <TotalsStrip report={report} />
      </GlassCard>
    </div>
  );
};

// Table ke neeche kul jod — CA ko GSTR me yahi numbers chahiye.
const TotalsStrip = ({ report }: { report: GstReport }) => (
  <dl className="mt-3 flex flex-wrap justify-end gap-x-6 gap-y-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm">
    {[
      ["Taxable", report.taxableAmount],
      ["CGST", report.cgstAmount],
      ["SGST", report.sgstAmount],
      ["IGST", report.igstAmount],
      ["Total GST", report.totalTaxAmount],
      ["Grand Total", report.grandTotal]
    ].map(([label, value]) => (
      <div key={String(label)} className="flex items-baseline gap-2">
        <dt className="text-slate-500">{label}</dt>
        <dd className={`tabular-nums ${label === "Grand Total" || label === "Total GST" ? "font-bold text-slate-950" : "font-semibold text-slate-800"}`}>{formatCurrency(Number(value ?? 0))}</dd>
      </div>
    ))}
  </dl>
);

const InvoiceWiseTable = ({ rows }: { rows: GstInvoiceWiseRow[] }) => (
  <Table
    data={rows}
    emptyText="No GST invoice data found."
    columns={[
      { key: "invoiceNo", header: "Invoice", render: (item) => <span className="block min-w-[150px] max-w-[180px] break-words font-semibold text-slate-950">{item.invoiceNo}</span> },
      { key: "invoiceDate", header: "Date", render: (item) => <span className="whitespace-nowrap">{formatDate(item.invoiceDate)}</span> },
      { key: "customerName", header: "Customer", render: (item) => <span className="whitespace-nowrap">{item.customerName}</span> },
      { key: "customerState", header: "Place of Supply", render: (item) => <span className="whitespace-nowrap">{item.customerState ?? "--"}</span> },
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
      { key: "customerName", header: "Customer", render: (item) => <span className="whitespace-nowrap">{item.customerName}</span> },
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

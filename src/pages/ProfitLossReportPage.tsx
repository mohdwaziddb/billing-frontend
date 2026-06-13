import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getExpenseCategories } from "../api/expenseCategories";
import { getProfitLossReport } from "../api/expenses";
import { getCustomers } from "../api/customers";
import { getInvoices } from "../api/invoices";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { StatCard } from "../components/StatCard";
import { Table } from "../components/Table";
import { useApiMessage } from "../hooks/useApiFeedback";
import { formatCurrency } from "../lib/currency";
import type { Customer, ExpenseCategory, Invoice, ProfitLossReport } from "../types/api";

const emptyReport: ProfitLossReport = { startDate: null, endDate: null, revenue: 0, expense: 0, netProfit: 0, expenseByCategory: [], revenueVsExpense: [] };
const todayIso = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

export const ProfitLossReportPage = () => {
  const { setApiError } = useApiMessage();
  const [report, setReport] = useState<ProfitLossReport>(emptyReport);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filters, setFilters] = useState({ startDate: todayIso(), endDate: todayIso(), expenseType: "", categoryId: "", customerId: "", invoiceId: "", createdByRole: "" });

  useEffect(() => {
    void Promise.all([
      getExpenseCategories({ active: true, size: 1000 }).then(setCategories),
      getCustomers({ active: true, size: 1000 }).then(setCustomers),
      getInvoices({ size: 1000 }).then(setInvoices)
    ]).catch((err: any) => setApiError(err, "Unable to load report filters"));
  }, []);

  useEffect(() => {
    void getProfitLossReport({
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      expenseType: filters.expenseType || undefined,
      categoryId: filters.categoryId || undefined,
      customerId: filters.customerId || undefined,
      invoiceId: filters.invoiceId || undefined,
      createdByRole: filters.createdByRole || undefined
    }).then(setReport).catch((err: any) => setApiError(err, "Unable to load profit and loss report"));
  }, [filters]);

  return (
    <div className="space-y-4 pb-6">
      <Header title="Profit & Loss" subtitle="Revenue, expense, and net profit reporting with expense attribution filters." />
      <GlassCard className="p-6 md:p-7">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input label="Start Date" type="date" value={filters.startDate} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))} />
          <Input label="End Date" type="date" value={filters.endDate} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))} />
          <Select label="Expense Type" value={filters.expenseType} options={[{ label: "All", value: "" }, { label: "General", value: "GENERAL" }, { label: "Customer Related", value: "CUSTOMER_RELATED" }, { label: "Invoice Related", value: "INVOICE_RELATED" }]} onChange={(event) => setFilters((current) => ({ ...current, expenseType: event.target.value }))} />
          <Select label="Category" value={filters.categoryId} options={[{ label: "All", value: "" }, ...categories.map((item) => ({ label: item.categoryName, value: String(item.id) }))]} onChange={(event) => setFilters((current) => ({ ...current, categoryId: event.target.value }))} />
          <Select label="Customer" value={filters.customerId} options={[{ label: "All", value: "" }, ...customers.map((item) => ({ label: item.name, value: String(item.id) }))]} onChange={(event) => setFilters((current) => ({ ...current, customerId: event.target.value }))} />
          <Select label="Invoice" value={filters.invoiceId} options={[{ label: "All", value: "" }, ...invoices.map((item) => ({ label: item.invoiceNo, value: String(item.id) }))]} onChange={(event) => setFilters((current) => ({ ...current, invoiceId: event.target.value }))} />
          <Select label="Created By" value={filters.createdByRole} options={[{ label: "All", value: "" }, { label: "Owner", value: "OWNER" }, { label: "Admin", value: "ADMIN" }, { label: "User", value: "USER" }]} onChange={(event) => setFilters((current) => ({ ...current, createdByRole: event.target.value }))} />
        </div>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Revenue" value={formatCurrency(report.revenue)} caption="Invoice revenue in selected period" />
        <StatCard label="Expense" value={formatCurrency(report.expense)} caption="Recorded expenses in selected period" />
        <StatCard label="Net Profit" value={formatCurrency(report.netProfit)} caption="Revenue minus expense" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <GlassCard className="p-6 md:p-7">
          <div className="mb-5">
            <p className="text-xs uppercase text-slate-400">Revenue vs Expense</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Net profit trend</h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.revenueVsExpense}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#f97316" radius={[8, 8, 0, 0]} />
                <Bar dataKey="netRevenue" name="Net Profit" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
        <GlassCard className="p-6 md:p-7">
          <div className="mb-5">
            <p className="text-xs uppercase text-slate-400">Expense Summary</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Expense by category</h2>
          </div>
          <Table
            data={report.expenseByCategory}
            emptyText="No expense data in this range."
            columns={[
              { key: "category", header: "Category", render: (item) => item.label },
              { key: "amount", header: "Amount", className: "text-right", render: (item) => <span className="block text-right font-semibold text-slate-950">{formatCurrency(item.value ?? item.expense ?? 0)}</span> }
            ]}
          />
        </GlassCard>
      </div>
    </div>
  );
};

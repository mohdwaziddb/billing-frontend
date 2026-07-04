import type { ReactNode } from "react";

type AiTableColumn = {
  key: string;
  header: string;
  type?: "currency" | "date" | "number" | "text";
};

type AiTableRow = Record<string, unknown>;

const COLUMN_SETS: Record<string, AiTableColumn[]> = {
  OUTSTANDING_CUSTOMERS: [
    { key: "name", header: "Customer" },
    { key: "mobile", header: "Mobile" },
    { key: "currentBalance", header: "Outstanding", type: "currency" },
    { key: "lastPurchaseDate", header: "Last Purchase", type: "date" }
  ],
  CUSTOMER_SEARCH: [
    { key: "name", header: "Customer" },
    { key: "mobile", header: "Mobile" },
    { key: "currentBalance", header: "Balance", type: "currency" },
    { key: "active", header: "Status" }
  ],
  PRODUCT_SEARCH: [
    { key: "name", header: "Product" },
    { key: "sku", header: "SKU" },
    { key: "stockQty", header: "Stock", type: "number" },
    { key: "sellingPrice", header: "Rate", type: "currency" }
  ],
  CURRENT_STOCK: [
    { key: "name", header: "Product" },
    { key: "sku", header: "SKU" },
    { key: "stockQty", header: "Stock", type: "number" },
    { key: "minStockQty", header: "Min", type: "number" }
  ],
  INVOICE_SEARCH: [
    { key: "invoiceNo", header: "Invoice" },
    { key: "customerName", header: "Customer" },
    { key: "invoiceDate", header: "Date", type: "date" },
    { key: "balanceAmount", header: "Balance", type: "currency" }
  ],
  PAYMENT_SEARCH: [
    { key: "customerName", header: "Customer" },
    { key: "invoiceNo", header: "Invoice" },
    { key: "amount", header: "Amount", type: "currency" },
    { key: "paymentDate", header: "Date", type: "date" }
  ]
};

const FALLBACK_KEYS = ["name", "customerName", "invoiceNo", "mobile", "amount", "currentBalance", "balanceAmount", "stockQty", "createdAt"];

export const AiDataTable = ({ intent, data }: { intent?: string; data: unknown }) => {
  const rows = normalizeRows(data);
  if (!rows.length) {
    return null;
  }

  const columns = resolveColumns(intent, rows);
  if (!columns.length) {
    return null;
  }

  const visibleRows = rows.slice(0, 10);
  const extraCount = rows.length - visibleRows.length;

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="scrollbar-thin max-h-72 overflow-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left text-xs text-slate-700">
          <thead className="sticky top-0 bg-slate-50 text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="whitespace-nowrap border-b border-slate-200 px-3 py-2 font-bold uppercase">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="odd:bg-white even:bg-slate-50/70">
                {columns.map((column) => (
                  <td key={column.key} className="max-w-[160px] truncate border-b border-slate-100 px-3 py-2 last:text-right">
                    {formatCell(row[column.key], column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {extraCount > 0 ? (
        <div className="border-t border-slate-100 px-3 py-2 text-xs font-medium text-slate-500">
          Showing first 10 of {rows.length} records.
        </div>
      ) : null}
    </div>
  );
};

const normalizeRows = (data: unknown): AiTableRow[] => {
  if (Array.isArray(data)) {
    return data.filter(isRow);
  }
  if (isRow(data) && Array.isArray(data.records)) {
    return data.records.filter(isRow);
  }
  return [];
};

const resolveColumns = (intent: string | undefined, rows: AiTableRow[]) => {
  const configured = intent ? COLUMN_SETS[intent] : undefined;
  if (configured) {
    return configured.filter((column) => rows.some((row) => row[column.key] !== undefined && row[column.key] !== null));
  }

  const keys = Object.keys(rows[0] ?? {}).filter((key) => FALLBACK_KEYS.includes(key)).slice(0, 4);
  return keys.map((key) => ({ key, header: toHeader(key), type: inferType(key) }));
};

const formatCell = (value: unknown, column: AiTableColumn): ReactNode => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (column.key === "active" && typeof value === "boolean") {
    return value ? "Active" : "Inactive";
  }
  if (column.type === "currency") {
    return formatCurrency(value);
  }
  if (column.type === "date") {
    return formatDate(value);
  }
  return String(value);
};

const formatCurrency = (value: unknown) => {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return String(value);
  }
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(numeric);
};

const formatDate = (value: unknown) => {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

const inferType = (key: string): AiTableColumn["type"] => {
  if (/amount|balance|price/i.test(key)) {
    return "currency";
  }
  if (/date|At$/i.test(key)) {
    return "date";
  }
  if (/count|qty|stock/i.test(key)) {
    return "number";
  }
  return "text";
};

const toHeader = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase());

const isRow = (value: unknown): value is AiTableRow => Boolean(value && typeof value === "object" && !Array.isArray(value));

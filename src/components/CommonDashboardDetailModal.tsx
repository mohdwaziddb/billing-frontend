import { Download, Search } from "lucide-react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { DEFAULT_PAGE_SIZE, Pagination } from "./Pagination";
import { StatusBadge } from "./StatusBadge";
import { formatAmount } from "../lib/currency";
import { formatDate } from "../lib/format";

export type DashboardDetailModalColumn<T> = {
  key: string;
  header: string;
  type?: "currency" | "date" | "status" | "text";
  className?: string;
  value?: (row: T) => string | number | null | undefined;
};

type CommonDashboardDetailModalProps<T> = {
  open: boolean;
  title: string;
  rows: T[];
  columns: DashboardDetailModalColumn<T>[];
  loading?: boolean;
  search: string;
  page: number;
  totalRecords: number;
  totalPages: number;
  activeFilters?: string[];
  grandTotal?: string;
  emptyText?: string;
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onExport: () => void;
};

export const CommonDashboardDetailModal = <T,>({
  open,
  title,
  rows,
  columns,
  loading = false,
  search,
  page,
  totalRecords,
  totalPages,
  activeFilters = [],
  grandTotal,
  emptyText = "No records found.",
  onClose,
  onSearchChange,
  onPageChange,
  onExport
}: CommonDashboardDetailModalProps<T>) => (
  <Modal open={open} title={title} onClose={onClose}>
    <div className="space-y-5">
      <div className="flex min-h-[52px] flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
        <span className="font-semibold text-slate-950">Active Filters:</span>
        <span className="min-w-0 flex-1 text-slate-600">{activeFilters.length ? activeFilters.join(" | ") : "No filters applied"}</span>
        <span className="font-semibold text-slate-950">Records: {totalRecords}</span>
        {grandTotal ? <span className="font-semibold text-slate-950">Grand Total: {grandTotal}</span> : null}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
          <input
            className="w-full rounded-[var(--radius-control)] border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--theme-color)] focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_14%,transparent)]"
            placeholder={`Search ${title.toLowerCase()}`}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
        <Button type="button" variant="secondary" disabled={!rows.length || loading} onClick={onExport}>
          <Download size={17} />
          Export Excel
        </Button>
      </div>

      <div className="scrollbar-thin overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-700">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={`whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 first:pl-5 last:pr-5 ${column.className ?? ""}`}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500 first:pl-5 last:pr-5" colSpan={columns.length}>Loading records...</td>
              </tr>
            ) : rows.length ? (
              rows.map((row, index) => (
                <tr key={index} className="group odd:bg-white even:bg-slate-50/55 transition hover:bg-[color-mix(in_srgb,var(--theme-color)_6%,white)]">
                  {columns.map((column) => (
                    <td key={column.key} className={`border-b border-slate-100 px-4 py-4 align-top text-slate-700 first:pl-5 last:pr-5 group-last:border-b-0 ${column.className ?? ""}`}>
                      {renderCell(resolveCellValue(row, column), column.type)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500 first:pl-5 last:pr-5" colSpan={columns.length}>{emptyText}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        size={DEFAULT_PAGE_SIZE}
        totalRecords={totalRecords}
        totalPages={totalPages}
        disabled={loading}
        onPageChange={onPageChange}
      />
    </div>
  </Modal>
);

const resolveCellValue = <T,>(row: T, column: DashboardDetailModalColumn<T>) => {
  if (column.value) {
    return column.value(row);
  }
  return (row as Record<string, unknown>)[column.key] as string | number | null | undefined;
};

const renderCell = (value: string | number | null | undefined, type?: DashboardDetailModalColumn<unknown>["type"]) => {
  if (value === null || value === undefined || value === "") {
    return "--";
  }
  if (type === "currency") {
    return formatAmount(Number(value ?? 0));
  }
  if (type === "date") {
    return formatDate(String(value ?? ""));
  }
  if (type === "status") {
    return <StatusBadge label={String(value)} />;
  }
  return String(value).replace(/_/g, " ");
};

import type { ReactNode } from "react";
import { EmptyState } from "./EmptyState";

export type Column<T> = {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  className?: string;
};

export type TableRowSelection<T> = {
  selectedRowIds: number[];
  onToggleRow: (rowId: number, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  allSelected: boolean;
  someSelected: boolean;
  getRowId?: (item: T) => number;
};

export const Table = <T,>({
  data,
  columns,
  emptyText = "No records found.",
  rowSelection,
  minHeightClass = "min-h-[360px]"
}: {
  data: T[];
  columns: Column<T>[];
  emptyText?: string;
  rowSelection?: TableRowSelection<T>;
  /** Default 360px (list pages). Dashboard jaise chhote widgets "min-h-0" de sakte hain. */
  minHeightClass?: string;
}) => {
  const rowCount = data.length;
  const allSelected = rowSelection?.allSelected ?? false;
  const someSelected = rowSelection?.someSelected ?? false;

  return (
    <div className={`scrollbar-thin ${minHeightClass} overflow-x-auto rounded-lg border border-slate-200 bg-white`}>
      <table className="min-w-full border-separate border-spacing-0 text-left fs-13 text-slate-700">
        <thead className="sticky top-0 z-10 bg-slate-50">
          <tr className="border-b border-slate-200 text-slate-500">
            {rowSelection ? (
              <th className="table-header whitespace-nowrap border-b border-slate-200 px-4 py-2.5 fs-11 font-semibold uppercase tracking-[0.08em] first:pl-5 last:pr-5">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-sky-500"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = someSelected && !allSelected;
                    }
                  }}
                  onChange={(event) => rowSelection.onToggleAll(event.target.checked)}
                  aria-label={allSelected ? "Unselect all rows" : "Select all rows"}
                />
              </th>
            ) : null}
            {columns.map((column) => (
              <th key={column.key} className={`table-header whitespace-nowrap border-b border-slate-200 px-4 py-2.5 fs-11 font-semibold uppercase tracking-[0.08em] first:pl-5 last:pr-5 ${column.className ?? ""}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowCount === 0 ? (
            <tr>
              <td className="h-[320px] px-4 py-10 text-center text-slate-500 first:pl-5 last:pr-5" colSpan={columns.length + (rowSelection ? 1 : 0)}>
                <EmptyState title={emptyText} />
              </td>
            </tr>
          ) : (
            data.map((item, index) => {
              const rowId = rowSelection?.getRowId ? rowSelection.getRowId(item) : (item as unknown as { id: number }).id;
              const checked = rowSelection ? rowSelection.selectedRowIds.includes(rowId) : false;
              return (
                <tr key={index} className="group odd:bg-white even:bg-slate-50/55 transition hover:bg-[color-mix(in_srgb,var(--theme-color)_6%,white)]">
                  {rowSelection ? (
                    <td className="border-b border-slate-100 px-4 py-3 align-top first:pl-5 last:pr-5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-sky-500"
                        checked={checked}
                        onChange={(event) => rowSelection.onToggleRow(rowId, event.target.checked)}
                        aria-label={checked ? "Deselect row" : "Select row"}
                      />
                    </td>
                  ) : null}
                  {columns.map((column) => (
                    <td key={column.key} className={`border-b border-slate-100 px-4 py-3 align-top first:pl-5 last:pr-5 group-last:border-b-0 ${column.className ?? ""}`}>
                      {column.render(item)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

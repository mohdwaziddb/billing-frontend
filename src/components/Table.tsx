import type { ReactNode } from "react";

type Column<T> = {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  className?: string;
};

export const Table = <T,>({
  data,
  columns,
  emptyText = "No records found.",
  emptyAction
}: {
  data: T[];
  columns: Column<T>[];
  emptyText?: string;
  emptyAction?: ReactNode;
}) => {
  return (
    <div className="scrollbar-thin min-h-[360px] overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-700">
        <thead className="sticky top-0 z-10 bg-slate-50">
          <tr className="border-b border-slate-200 text-slate-500">
            {columns.map((column) => (
              <th key={column.key} className={`table-header whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wide first:pl-5 last:pr-5 ${column.className ?? ""}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td className="h-[320px] px-4 py-10 text-center text-slate-500 first:pl-5 last:pr-5" colSpan={columns.length}>
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <p className="font-medium">{emptyText}</p>
                  {emptyAction}
                </div>
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr key={index} className="group odd:bg-white even:bg-slate-50/55 transition hover:bg-[color-mix(in_srgb,var(--theme-color)_6%,white)]">
                {columns.map((column) => (
                  <td key={column.key} className={`border-b border-slate-100 px-4 py-4 align-top first:pl-5 last:pr-5 group-last:border-b-0 ${column.className ?? ""}`}>
                    {column.render(item)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

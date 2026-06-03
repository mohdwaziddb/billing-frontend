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
  emptyText = "No records found."
}: {
  data: T[];
  columns: Column<T>[];
  emptyText?: string;
}) => {
  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-200/90">
        <thead>
          <tr className="border-b border-white/10 text-slate-400">
            {columns.map((column) => (
              <th key={column.key} className={`whitespace-nowrap border-b border-white/10 px-4 pb-3 pt-1 font-medium first:pl-0 last:pr-0 ${column.className ?? ""}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td className="px-4 py-10 text-center text-slate-400 first:pl-0 last:pr-0" colSpan={columns.length}>
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr key={index} className="group">
                {columns.map((column) => (
                  <td key={column.key} className={`border-b border-white/5 px-4 py-4 align-top first:pl-0 last:pr-0 group-last:border-b-0 ${column.className ?? ""}`}>
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

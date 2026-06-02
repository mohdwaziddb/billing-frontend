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
      <table className="min-w-full text-left text-sm text-slate-200/85">
        <thead>
          <tr className="border-b border-white/10 text-slate-400">
            {columns.map((column) => (
              <th key={column.key} className={`pb-3 pr-4 font-medium ${column.className ?? ""}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td className="py-8 text-center text-slate-400" colSpan={columns.length}>
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr key={index} className="border-b border-white/5 last:border-b-0">
                {columns.map((column) => (
                  <td key={column.key} className={`py-4 pr-4 align-top ${column.className ?? ""}`}>
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

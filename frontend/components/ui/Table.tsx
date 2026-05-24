import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type DataColumn<T extends object> = {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
};

type TableProps<T extends object> = {
  children?: ReactNode;
  className?: string;
  columns?: DataColumn<T>[];
  rows?: T[];
  getRowKey?: (row: T) => string | number;
};

export function Table<T extends object>({ children, className, columns, rows, getRowKey }: TableProps<T>) {
  const tableContent = columns && rows ? (
    <>
      <thead>
        <tr>
          {columns.map((column) => (
            <Th key={column.key}>{column.header}</Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={getRowKey ? getRowKey(row) : index}>
            {columns.map((column) => (
              <Td key={column.key}>{column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? "-")}</Td>
            ))}
          </tr>
        ))}
      </tbody>
    </>
  ) : (
    children
  );

  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full min-w-[720px] text-left text-sm", className)}>{tableContent}</table>
    </div>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return <th className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</th>;
}

export function Td({ children }: { children: ReactNode }) {
  return <td className="border-b border-slate-100 px-4 py-3 text-slate-700">{children}</td>;
}

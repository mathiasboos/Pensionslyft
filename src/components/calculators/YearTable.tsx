import type { ReactNode } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { num } from "@/lib/format";
import { downloadCsv, downloadExcel, type ExportColumn } from "@/lib/export";
import { cn } from "@/lib/utils";
import { Collapsible } from "./Collapsible";

/**
 * A table of the result year by year, in a card that is folded in from the start, with the buttons that download
 * the same table as CSV or Excel. The buttons are in the header, so they work while the table is folded in.
 */
export function YearTable<T>({
  id,
  title,
  columns,
  rows,
  rowKey,
  fileName,
  sheet,
  open,
  onToggle,
  rowClassName,
  cellSuffix,
}: {
  id: string;
  title: string;
  columns: ExportColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  /** the name of the downloaded files, without the ending */
  fileName: string;
  /** the name of the sheet in the Excel file */
  sheet: string;
  open?: boolean;
  onToggle?: () => void;
  rowClassName?: (row: T) => string | undefined;
  /** something after the value of a cell, such as a flag on the year of a goal */
  cellSuffix?: (row: T, column: number) => ReactNode;
}) {
  return (
    <Collapsible
      id={id}
      title={title}
      open={open}
      onToggle={onToggle}
      className="rounded-xl border border-border bg-card"
      headerClassName="p-4 sm:px-6"
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => downloadCsv(rows, columns, `${fileName}.csv`)}>
            <Download aria-hidden="true" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadExcel(rows, columns, `${fileName}.xlsx`, sheet)}>
            <Download aria-hidden="true" /> Excel
          </Button>
        </>
      }
    >
      <div className="max-h-96 overflow-auto border-t border-border">
        <table className="w-full text-right text-xs tabular-nums">
          <thead className="sticky top-0 bg-muted">
            <tr>
              {columns.map((c) => (
                <th key={c.label} scope="col" className="px-3 py-2 font-medium whitespace-nowrap first:text-left">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className={cn("border-t border-border", rowClassName?.(row))}>
                {columns.map((c, i) => (
                  <td key={c.label} className="px-3 py-1.5 whitespace-nowrap first:text-left">
                    {c.plain ? c.value(row) : num.format(Math.round(c.value(row)))}
                    {cellSuffix?.(row, i)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Collapsible>
  );
}
